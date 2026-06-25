import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'
import type { TimeWindow } from '@/lib/matching/match-waitlist'
import { generateToken } from '@/lib/tokens/generate-token'
import { sendVerificationEmail } from '@/lib/notifications/email'

export interface JoinWaitlistInput {
  businessSlug: string
  name: string
  email: string
  phone: string
  timeWindows: TimeWindow[]
}

export async function joinWaitlist(
  supabase: SupabaseClient<Database>,
  input: JoinWaitlistInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id, name')
    .eq('public_slug', input.businessSlug)
    .maybeSingle()
  if (!business) return { ok: false, error: 'Business not found' }

  const { data: emailMatches } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', business.id)
    .eq('email', input.email)
  const { data: phoneMatches } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', business.id)
    .eq('phone', input.phone)

  const matchingClientIds = [...new Set([...(emailMatches ?? []), ...(phoneMatches ?? [])].map((c) => c.id))]

  if (matchingClientIds.length > 0) {
    const { data: activeEntries } = await supabase
      .from('waitlist_entries')
      .select('id')
      .in('client_id', matchingClientIds)
      .eq('status', 'active')
    if (activeEntries && activeEntries.length > 0) {
      return { ok: false, error: 'You are already on the waitlist for this business.' }
    }
  }

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ business_id: business.id, name: input.name, email: input.email, phone: input.phone })
    .select('id')
    .single()
  if (clientError || !client) return { ok: false, error: 'Could not create client record.' }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { error: entryError } = await supabase.from('waitlist_entries').insert({
    business_id: business.id,
    client_id: client.id,
    time_windows: input.timeWindows as unknown as Json,
    status: 'pending_verification',
    email_verification_token: token,
    expires_at: expiresAt,
  })
  if (entryError) return { ok: false, error: 'Could not create waitlist entry.' }

  await sendVerificationEmail(input.email, {
    businessName: business.name,
    verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify-email/${token}`,
    expiryHours: 48,
  })

  return { ok: true }
}
