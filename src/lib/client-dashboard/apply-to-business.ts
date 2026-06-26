import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export type TimeWindow = { days: number[]; start: string; end: string }

export async function applyToBusiness(
  supabase: SupabaseClient<Database>,
  userId: string,
  businessSlug: string,
  timeWindows: TimeWindow[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('public_slug', businessSlug)
    .maybeSingle()

  if (!business) return { ok: false, error: 'Business not found.' }

  const businessId = business.id

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .maybeSingle()

  let clientId: string

  if (existingClient) {
    const { data: activeEntry } = await supabase
      .from('waitlist_entries')
      .select('id')
      .eq('client_id', existingClient.id)
      .eq('status', 'active')
      .maybeSingle()

    if (activeEntry) return { ok: false, error: 'You are already on the waitlist for this business.' }

    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientError } = await supabase
      .from('clients')
      .insert({ business_id: businessId, user_id: userId })
      .select('id')
      .single()

    if (clientError || !newClient) return { ok: false, error: 'Could not create client record. Please try again.' }
    clientId = newClient.id
  }

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

  const { error: entryError } = await supabase.from('waitlist_entries').insert({
    business_id: businessId,
    client_id: clientId,
    time_windows: timeWindows as unknown as Json,
    status: 'active',
    expires_at: expiresAt,
  })

  if (entryError) return { ok: false, error: 'Could not create waitlist entry. Please try again.' }
  return { ok: true }
}
