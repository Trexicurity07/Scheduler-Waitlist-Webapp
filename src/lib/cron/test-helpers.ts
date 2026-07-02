import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function createTestBusiness(
  supabase: SupabaseClient<Database>,
  overrides: Record<string, unknown> = {}
): Promise<{ businessId: string; userId: string }> {
  const userId = randomUUID()
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`

  const { error: profileError } = await supabase.from('owner_profiles').insert({
    auth_user_id: userId,
    business_name: `Test Business ${suffix}`,
    email: `owner-${suffix}@example.com`,
  })
  if (profileError) throw profileError

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      owner_user_id: userId,
      name: 'Test Business',
      public_slug: `test-business-${suffix}`,
      whatsapp_number: '15551234567',
      timezone: 'UTC',
      google_refresh_token_encrypted: 'encrypted-placeholder',
      dedicated_calendar_id: 'calendar-placeholder',
      business_type: 'Test',
      ...overrides,
    })
    .select('id')
    .single()
  if (error || !data) throw error

  return { businessId: data.id, userId }
}

export async function cleanupTestBusiness(
  supabase: SupabaseClient<Database>,
  businessId: string,
  userId: string
): Promise<void> {
  await supabase.from('businesses').delete().eq('id', businessId)
  await supabase.from('owner_profiles').delete().eq('auth_user_id', userId)
}

export async function cleanupTestClient(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  await supabase.from('client_profiles').delete().eq('user_id', userId)
}

export async function createTestClientAndEntry(
  supabase: SupabaseClient<Database>,
  businessId: string,
  overrides: { time_windows?: { days: number[]; start: string; end: string }[]; status?: string; expires_at?: string } = {}
): Promise<{ clientId: string; entryId: string; userId: string }> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const email = `client-${uniqueSuffix}@example.com`
  const phone = `1555${Math.floor(1000000 + Math.random() * 8999999)}`
  const userId = randomUUID()

  const { error: profileError } = await supabase.from('client_profiles').insert({
    user_id: userId,
    name: 'Test Client',
    email,
    phone,
  })
  if (profileError) throw profileError

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ business_id: businessId, user_id: userId })
    .select('id')
    .single()
  if (clientError || !client) throw clientError

  const defaultExpiry = new Date()
  defaultExpiry.setMonth(defaultExpiry.getMonth() + 1)
  const expiresAt = overrides.expires_at ?? defaultExpiry.toISOString()

  const { data: entry, error: entryError } = await supabase
    .from('waitlist_entries')
    .insert({
      business_id: businessId,
      client_id: client.id,
      time_windows: overrides.time_windows ?? [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }],
      status: overrides.status ?? 'active',
      expires_at: expiresAt,
    })
    .select('id')
    .single()
  if (entryError || !entry) throw entryError

  return { clientId: client.id, entryId: entry.id, userId }
}
