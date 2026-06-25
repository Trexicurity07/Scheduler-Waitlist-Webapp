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

  const { data: emailClient } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', business.id)
    .eq('email', input.email)
    .maybeSingle()
  const { data: phoneClient } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', business.id)
    .eq('phone', input.phone)
    .maybeSingle()

  if (emailClient && phoneClient && emailClient.id !== phoneClient.id) {
    return { ok: false, error: 'This email and phone number belong to different existing clients.' }
  }
  if (emailClient && !phoneClient) {
    return { ok: false, error: 'This email is already registered with a different phone number.' }
  }
  if (phoneClient && !emailClient) {
    return { ok: false, error: 'This phone number is already registered with a different email address.' }
  }

  let clientId: string
  if (emailClient) {
    clientId = emailClient.id
    await supabase.from('clients').update({ name: input.name }).eq('id', clientId)
  } else {
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .insert({ business_id: business.id, name: input.name, email: input.email, phone: input.phone })
      .select('id')
      .single()
    if (clientError || !client) return { ok: false, error: 'Could not create client record.' }
    clientId = client.id
  }

  const { data: activeEntry } = await supabase
    .from('waitlist_entries')
    .select('id')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .maybeSingle()
  if (activeEntry) {
    return { ok: false, error: 'You are already on the waitlist for this business.' }
  }

  const token = generateToken()
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { error: entryError } = await supabase.from('waitlist_entries').insert({
    business_id: business.id,
    client_id: clientId,
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
