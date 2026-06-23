import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createServiceRoleClient } from './supabase'

describe('createServiceRoleClient (integration)', () => {
  let businessId: string
  let userId: string

  beforeAll(async () => {
    const supabase = createServiceRoleClient()
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email: `test-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    if (userError || !userData.user) throw userError
    userId = userData.user.id

    const { data, error } = await supabase
      .from('businesses')
      .insert({
        owner_user_id: userId,
        name: 'Test Salon',
        public_slug: `test-salon-${Date.now()}`,
        whatsapp_number: '15551234567',
        timezone: 'America/New_York',
        google_refresh_token_encrypted: 'encrypted-placeholder',
        dedicated_calendar_id: 'calendar-placeholder',
      })
      .select()
      .single()
    if (error || !data) throw error
    businessId = data.id
  })

  afterAll(async () => {
    const supabase = createServiceRoleClient()
    await supabase.from('businesses').delete().eq('id', businessId)
    await supabase.auth.admin.deleteUser(userId)
  })

  it('inserts and reads back a business row', async () => {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.from('businesses').select('name').eq('id', businessId).single()
    expect(error).toBeNull()
    expect(data?.name).toBe('Test Salon')
  })
})
