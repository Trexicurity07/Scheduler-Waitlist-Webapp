import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ClaimedBusiness } from './claim-businesses'
import {
  matchWaitlistEntries,
  type TimeWindow,
  type WaitlistEntryForMatching,
  type SlotToMatch,
} from '@/lib/matching/match-waitlist'
import { generateToken } from '@/lib/tokens/generate-token'
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp'
import { sendSlotOfferEmail, sendSlotGoneEmail } from '@/lib/notifications/email'

export async function resolveStaleOffers(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness
): Promise<void> {
  const { data: pendingOffers } = await supabase
    .from('notifications')
    .select('id, appointment_id, waitlist_entry_id, waitlist_entries!inner(business_id)')
    .eq('type', 'slot_offer')
    .eq('status', 'sent')
    .eq('waitlist_entries.business_id', business.id)
    .not('appointment_id', 'is', null)

  if (!pendingOffers || pendingOffers.length === 0) return

  const appointmentIds = [...new Set(pendingOffers.map((o) => o.appointment_id as string))]

  for (const appointmentId of appointmentIds) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id, start_time, end_time')
      .eq('id', appointmentId)
      .single()
    if (!appointment) continue

    const { data: overlapping } = await supabase
      .from('appointments')
      .select('id')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .lt('start_time', appointment.end_time)
      .gt('end_time', appointment.start_time)
      .neq('id', appointment.id)
      .limit(1)

    if (!overlapping || overlapping.length === 0) continue

    const offersForThisAppointment = pendingOffers.filter((o) => o.appointment_id === appointmentId)
    for (const offer of offersForThisAppointment) {
      await supabase
        .from('notifications')
        .update({ status: 'superseded', responded_at: new Date().toISOString() })
        .eq('id', offer.id)

      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('client_id')
        .eq('id', offer.waitlist_entry_id)
        .single()
      if (!entry) continue
      const { data: clientRow } = await supabase.from('clients').select('client_profiles(email)').eq('id', entry.client_id).single()
      const clientEmail = (clientRow?.client_profiles as { email: string } | null)?.email
      if (!clientEmail) continue

      await sendSlotGoneEmail(clientEmail, {
        businessName: business.name,
        whatsappLink: buildWhatsAppLink(business.whatsapp_number, `Hi! Just checking in about ${business.name}.`),
      })
    }
  }
}

export async function expireTimedOutOffers(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  const cutoff = new Date(now.getTime() - business.batch_interval_minutes * 60 * 1000).toISOString()

  const { data: timedOut } = await supabase
    .from('notifications')
    .select('id, waitlist_entries!inner(business_id)')
    .eq('type', 'slot_offer')
    .eq('status', 'sent')
    .eq('waitlist_entries.business_id', business.id)
    .lt('sent_at', cutoff)

  if (!timedOut || timedOut.length === 0) return

  await supabase
    .from('notifications')
    .update({ status: 'expired' })
    .in('id', timedOut.map((n) => n.id))
}

export async function dispatchPendingOffers(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  const { data: cancelledAppointments } = await supabase
    .from('appointments')
    .select('id, start_time, end_time')
    .eq('business_id', business.id)
    .eq('status', 'cancelled')
    .gt('start_time', now.toISOString())

  if (!cancelledAppointments) return

  for (const appointment of cancelledAppointments) {
    await dispatchOfferForAppointment(supabase, business, appointment, now)
  }
}

async function dispatchOfferForAppointment(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  appointment: { id: string; start_time: string; end_time: string },
  now: Date
): Promise<void> {
  const startTime = new Date(appointment.start_time)
  const hoursUntilStart = (startTime.getTime() - now.getTime()) / (1000 * 60 * 60)

  if (hoursUntilStart < business.min_notice_hours) return
  if (hoursUntilStart < business.min_confirm_lead_hours) return

  const { data: existingNotifications } = await supabase
    .from('notifications')
    .select('id, status, waitlist_entry_id, batch_number')
    .eq('appointment_id', appointment.id)
    .eq('type', 'slot_offer')

  const notifications = existingNotifications ?? []
  if (notifications.some((n) => n.status === 'sent')) return
  if (notifications.some((n) => n.status === 'confirmed')) return

  const alreadyNotifiedEntryIds = new Set(notifications.map((n) => n.waitlist_entry_id))
  const highestBatchNumber = notifications.reduce((max, n) => Math.max(max, n.batch_number ?? 0), 0)

  const { data: activeEntries } = await supabase
    .from('waitlist_entries')
    .select('id, created_at, time_windows, client_id')
    .eq('business_id', business.id)
    .eq('status', 'active')

  const entries = activeEntries ?? []
  const candidates: WaitlistEntryForMatching[] = entries
    .filter((e) => !alreadyNotifiedEntryIds.has(e.id))
    .map((e) => ({ id: e.id, createdAt: new Date(e.created_at), timeWindows: e.time_windows as unknown as TimeWindow[] }))

  const slot: SlotToMatch = { startTime, timezone: business.timezone }
  const matched = matchWaitlistEntries(slot, candidates).slice(0, business.batch_size)
  if (matched.length === 0) return

  const nextBatchNumber = highestBatchNumber + 1
  const slotDescription = startTime.toLocaleString('en-US', {
    timeZone: business.timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })

  for (const match of matched) {
    const entry = entries.find((e) => e.id === match.id)
    if (!entry) continue
    const { data: clientRow } = await supabase.from('clients').select('client_profiles(email)').eq('id', entry.client_id).single()
    const clientEmail = (clientRow?.client_profiles as { email: string } | null)?.email
    if (!clientEmail) continue

    const token = generateToken()
    const confirmUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${token}`
    const declineUrl = `${process.env.NEXT_PUBLIC_APP_URL}/confirm/${token}?decline=true`
    const whatsappLink = buildWhatsAppLink(
      business.whatsapp_number,
      `Hi! I'd like to grab the ${slotDescription} slot with ${business.name}.`
    )

    await supabase.from('notifications').insert({
      waitlist_entry_id: match.id,
      appointment_id: appointment.id,
      type: 'slot_offer',
      channel: 'email',
      status: 'sent',
      token,
      batch_number: nextBatchNumber,
    })

    await sendSlotOfferEmail(clientEmail, {
      businessName: business.name,
      slotDescription,
      confirmUrl,
      declineUrl,
      whatsappLink,
    })
  }
}
