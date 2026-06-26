import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { TimeWindow } from '@/lib/matching/match-waitlist'
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp'
import { sendOwnerActivityEmail } from '@/lib/notifications/email'

export interface AddWaitlistEntryInput {
  identifier: string // email or phone — looks up client_profiles
  timeWindows: TimeWindow[]
}

export interface BusinessSettingsInput {
  batchSize: number
  batchIntervalMinutes: number
  minNoticeHours: number
  minConfirmLeadHours: number
}

function ownerWhatsAppLink(businessName: string, whatsappNumber: string): string {
  return buildWhatsAppLink(whatsappNumber, `Hi! Just checking in about ${businessName}.`)
}

export async function addWaitlistEntry(
  supabase: SupabaseClient<Database>,
  businessId: string,
  input: AddWaitlistEntryInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: business } = await supabase
    .from('businesses')
    .select('name, whatsapp_number')
    .eq('id', businessId)
    .single()
  if (!business) return { ok: false, error: 'Business not found' }

  // Resolve client_profiles by email or normalised phone
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.identifier)
  const { data: profile } = await supabase
    .from('client_profiles')
    .select('user_id, name, email')
    .eq(isEmail ? 'email' : 'phone', input.identifier)
    .maybeSingle()

  if (!profile) {
    return {
      ok: false,
      error: 'No client account found for this email or phone. The client must sign up first.',
    }
  }

  // Find or create the per-business clients row
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', profile.user_id)
    .maybeSingle()

  let clientId: string
  if (existingClient) {
    // Check for an already-active entry
    const { data: activeEntry } = await supabase
      .from('waitlist_entries')
      .select('id')
      .eq('client_id', existingClient.id)
      .eq('status', 'active')
      .maybeSingle()
    if (activeEntry) return { ok: false, error: 'This client already has an active waitlist entry.' }
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ business_id: businessId, user_id: profile.user_id })
      .select('id')
      .single()
    if (clientError || !newClient) return { ok: false, error: 'Could not create client record.' }
    clientId = newClient.id
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
  const { error: entryError } = await supabase.from('waitlist_entries').insert({
    business_id: businessId,
    client_id: clientId,
    time_windows: input.timeWindows as unknown as Json,
    status: 'active',
    expires_at: expiresAt,
  })
  if (entryError) return { ok: false, error: 'Could not create waitlist entry.' }

  await sendOwnerActivityEmail(profile.email, {
    businessName: business.name,
    action: 'added',
    whatsappLink: ownerWhatsAppLink(business.name, business.whatsapp_number),
  })
  return { ok: true }
}

export async function removeWaitlistEntry(
  supabase: SupabaseClient<Database>,
  businessId: string,
  entryId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, business_id, clients(client_profiles(name, email))')
    .eq('id', entryId)
    .maybeSingle()

  if (!entry || entry.business_id !== businessId) {
    return { ok: false, error: 'Waitlist entry not found' }
  }

  await supabase.from('waitlist_entries').update({ status: 'removed' }).eq('id', entryId)

  const { data: business } = await supabase
    .from('businesses')
    .select('name, whatsapp_number')
    .eq('id', businessId)
    .single()

  const clientProfile = (entry.clients as { client_profiles?: { name?: string; email?: string } } | null)?.client_profiles
  if (clientProfile?.email && business) {
    await sendOwnerActivityEmail(clientProfile.email, {
      businessName: business.name,
      action: 'removed',
      whatsappLink: ownerWhatsAppLink(business.name, business.whatsapp_number),
    })
  }

  return { ok: true }
}

export async function updateBusinessSettings(
  supabase: SupabaseClient<Database>,
  businessId: string,
  input: BusinessSettingsInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (input.minConfirmLeadHours >= input.minNoticeHours) {
    return { ok: false, error: 'Confirmation lead time must be less than the minimum notice period.' }
  }

  const { error } = await supabase
    .from('businesses')
    .update({
      batch_size: input.batchSize,
      batch_interval_minutes: input.batchIntervalMinutes,
      min_notice_hours: input.minNoticeHours,
      min_confirm_lead_hours: input.minConfirmLeadHours,
    })
    .eq('id', businessId)

  if (error) return { ok: false, error: 'Could not update settings.' }
  return { ok: true }
}
