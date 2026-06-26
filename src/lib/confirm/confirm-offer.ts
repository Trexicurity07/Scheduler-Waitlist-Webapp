import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CalendarProvider } from '@/lib/calendar/provider'

export interface OfferDetails {
  businessName: string
  slotDescription: string
  startTime: string
  endTime: string
}

export type OfferFailureReason = 'invalid' | 'already_confirmed' | 'already_declined' | 'expired' | 'gone'

interface OfferRow {
  id: string
  status: string
  appointment_id: string | null
  waitlist_entry_id: string
  appointments: { id: string; status: string; summary: string | null; start_time: string; end_time: string } | null
  waitlist_entries: {
    id: string
    business_id: string
    clients: { client_profiles: { name: string; email: string; phone: string } | null } | null
  } | null
}

async function fetchOfferRow(supabase: SupabaseClient<Database>, token: string): Promise<OfferRow | null> {
  const { data } = await supabase
    .from('notifications')
    .select(
      'id, status, appointment_id, waitlist_entry_id, appointments(id, status, summary, start_time, end_time), waitlist_entries(id, business_id, clients(client_profiles(name, email, phone)))'
    )
    .eq('token', token)
    .eq('type', 'slot_offer')
    .maybeSingle()
  return data as OfferRow | null
}

async function fetchBusiness(supabase: SupabaseClient<Database>, businessId: string) {
  const { data } = await supabase
    .from('businesses')
    .select('id, name, min_confirm_lead_hours, dedicated_calendar_id')
    .eq('id', businessId)
    .single()
  return data!
}

function statusFailure(status: string): OfferFailureReason | null {
  if (status === 'confirmed') return 'already_confirmed'
  if (status === 'declined') return 'already_declined'
  if (status === 'expired') return 'expired'
  if (status === 'superseded') return 'gone'
  return null
}

export async function getOfferDetails(
  supabase: SupabaseClient<Database>,
  token: string,
  now: Date = new Date()
): Promise<{ ok: true; details: OfferDetails } | { ok: false; reason: OfferFailureReason }> {
  const offer = await fetchOfferRow(supabase, token)
  if (!offer) return { ok: false, reason: 'invalid' }

  const statusReason = statusFailure(offer.status)
  if (statusReason) return { ok: false, reason: statusReason }

  const appointment = offer.appointments
  const waitlistEntry = offer.waitlist_entries
  if (!appointment || appointment.status !== 'cancelled' || !waitlistEntry) {
    return { ok: false, reason: 'gone' }
  }

  const business = await fetchBusiness(supabase, waitlistEntry.business_id)
  const hoursUntilStart = (new Date(appointment.start_time).getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilStart < business.min_confirm_lead_hours) {
    return { ok: false, reason: 'gone' }
  }

  return {
    ok: true,
    details: {
      businessName: business.name,
      slotDescription: appointment.summary ?? 'Appointment',
      startTime: appointment.start_time,
      endTime: appointment.end_time,
    },
  }
}

export async function confirmOffer(
  supabase: SupabaseClient<Database>,
  token: string,
  provider: CalendarProvider,
  now: Date = new Date()
): Promise<{ ok: true } | { ok: false; reason: OfferFailureReason }> {
  const offer = await fetchOfferRow(supabase, token)
  if (!offer) return { ok: false, reason: 'invalid' }

  const statusReason = statusFailure(offer.status)
  if (statusReason) return { ok: false, reason: statusReason }

  const appointment = offer.appointments
  const waitlistEntry = offer.waitlist_entries
  const clientProfile = waitlistEntry?.clients?.client_profiles
  if (!appointment || appointment.status !== 'cancelled' || !waitlistEntry || !clientProfile) {
    return { ok: false, reason: 'gone' }
  }

  const business = await fetchBusiness(supabase, waitlistEntry.business_id)
  const hoursUntilStart = (new Date(appointment.start_time).getTime() - now.getTime()) / (1000 * 60 * 60)
  if (hoursUntilStart < business.min_confirm_lead_hours) {
    return { ok: false, reason: 'gone' }
  }

  const { data: alreadyConfirmed } = await supabase
    .from('notifications')
    .select('id')
    .eq('appointment_id', appointment.id)
    .eq('status', 'confirmed')
    .maybeSingle()
  if (alreadyConfirmed) {
    return { ok: false, reason: 'gone' }
  }

  // Atomically claim the appointment itself: only one concurrent request for
  // sibling notification tokens (same appointment_id, different client_id)
  // can flip status cancelled -> confirmed. This closes the TOCTOU window
  // that existed when the appointment's status was only read via a plain
  // SELECT (in fetchOfferRow) before later writes.
  const { data: claimedAppointment } = await supabase
    .from('appointments')
    .update({ status: 'confirmed' })
    .eq('id', appointment.id)
    .eq('status', 'cancelled')
    .select('id')
    .maybeSingle()
  if (!claimedAppointment) {
    return { ok: false, reason: 'gone' }
  }

  const { data: claimed } = await supabase
    .from('notifications')
    .update({ status: 'confirmed', responded_at: now.toISOString() })
    .eq('id', offer.id)
    .eq('status', 'sent')
    .select('id')
    .maybeSingle()
  if (!claimed) {
    return { ok: false, reason: 'gone' }
  }

  await provider.createEvent(business.dedicated_calendar_id, {
    summary: appointment.summary ?? 'Appointment',
    description: `Client: ${clientProfile.name}, ${clientProfile.email}, ${clientProfile.phone}`,
    startTime: new Date(appointment.start_time),
    endTime: new Date(appointment.end_time),
  })

  await supabase.from('waitlist_entries').update({ status: 'filled' }).eq('id', waitlistEntry.id)

  await supabase
    .from('notifications')
    .update({ status: 'superseded' })
    .eq('appointment_id', appointment.id)
    .eq('status', 'sent')
    .neq('id', offer.id)

  return { ok: true }
}

export async function declineOffer(
  supabase: SupabaseClient<Database>,
  token: string,
  now: Date = new Date()
): Promise<{ ok: true } | { ok: false; reason: OfferFailureReason }> {
  const offer = await fetchOfferRow(supabase, token)
  if (!offer) return { ok: false, reason: 'invalid' }

  const statusReason = statusFailure(offer.status)
  if (statusReason) return { ok: false, reason: statusReason }

  const { data: claimed } = await supabase
    .from('notifications')
    .update({ status: 'declined', responded_at: now.toISOString() })
    .eq('id', offer.id)
    .eq('status', 'sent')
    .select('id')
    .maybeSingle()
  if (!claimed) {
    return { ok: false, reason: 'gone' }
  }

  return { ok: true }
}
