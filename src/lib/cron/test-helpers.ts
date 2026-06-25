import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function createTestBusiness(
  supabase: SupabaseClient<Database>,
  overrides: Record<string, unknown> = {}
): Promise<{ businessId: string; userId: string }> {
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: `cron-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'test-password-123',
    email_confirm: true,
  })
  if (userError || !userData.user) throw userError

  const { data, error } = await supabase
    .from('businesses')
    .insert({
      owner_user_id: userData.user.id,
      name: 'Test Business',
      public_slug: `test-business-${Date.now()}-${Math.random().toString(36).slice(2)}`,
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

  return { businessId: data.id, userId: userData.user.id }
}

export async function cleanupTestBusiness(
  supabase: SupabaseClient<Database>,
  businessId: string,
  userId: string
): Promise<void> {
  await supabase.from('businesses').delete().eq('id', businessId)
  await supabase.auth.admin.deleteUser(userId)
}

export async function cleanupTestClient(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  await supabase.auth.admin.deleteUser(userId)
}

export async function createTestClientAndEntry(
  supabase: SupabaseClient<Database>,
  businessId: string,
  overrides: { time_windows?: { days: number[]; start: string; end: string }[]; status?: string; expires_at?: string } = {}
): Promise<{ clientId: string; entryId: string; userId: string }> {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const email = `client-${uniqueSuffix}@example.com`
  const phone = `1555${Math.floor(1000000 + Math.random() * 8999999)}`

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true,
  })
  if (userError || !userData.user) throw userError

  const { error: profileError } = await supabase.from('client_profiles').insert({
    user_id: userData.user.id,
    name: 'Test Client',
    email,
    phone,
    verified_at: new Date().toISOString(),
  })
  if (profileError) throw profileError

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({ business_id: businessId, user_id: userData.user.id })
    .select('id')
    .single()
  if (clientError || !client) throw clientError

  const expiresAt = overrides.expires_at ?? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()

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

  return { clientId: client.id, entryId: entry.id, userId: userData.user.id }
}
