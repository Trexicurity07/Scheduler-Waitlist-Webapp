import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'

// signupClient (called via createUnverifiedClient below) sends a verification
// email through the real `resend` SDK, which requires RESEND_API_KEY. That key
// is not populated with a real secret in this environment, so mock the module
// the same way src/lib/notifications/email.test.ts and signup-client.test.ts do.
const mockSend = vi.fn()
vi.mock('resend', () => {
  const Resend = vi.fn(function () {
    return { emails: { send: mockSend } }
  })
  return { Resend }
})

beforeEach(() => {
  mockSend.mockReset()
  process.env.RESEND_API_KEY = 'fake-key'
  process.env.RESEND_FROM_EMAIL = 'notifications@example.com'
})

import { signupClient } from './signup-client'
import { verifyClientEmail } from './verify-client-email'

describe('verifyClientEmail (integration)', () => {
  const createdUserIds: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    for (const id of createdUserIds.splice(0)) {
      await supabase.auth.admin.deleteUser(id)
    }
  })

  async function createUnverifiedClient() {
    const supabase = createServiceRoleClient()
    const email = `verify-test-${Date.now()}@example.com`
    await signupClient(supabase, {
      name: 'Verify Me',
      email,
      phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`,
      password: 'SecurePass1',
    })
    const { data: profile } = await supabase.from('client_profiles').select('user_id, email_verification_token').eq('email', email).single()
    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)
    if (user) createdUserIds.push(user.id)
    return { supabase, profile: profile!, email }
  }

  it('sets verified_at and clears token on valid token', async () => {
    const { supabase, profile, email } = await createUnverifiedClient()
    const result = await verifyClientEmail(supabase, profile.email_verification_token!)
    expect(result.ok).toBe(true)
    const { data: updated } = await supabase.from('client_profiles').select('verified_at, email_verification_token').eq('email', email).single()
    expect(updated?.verified_at).not.toBeNull()
    expect(updated?.email_verification_token).toBeNull()
  })

  it('returns error on invalid token', async () => {
    const supabase = createServiceRoleClient()
    const result = await verifyClientEmail(supabase, 'not-a-real-token')
    expect(result.ok).toBe(false)
  })

  it('returns error when token is already used', async () => {
    const { supabase, profile } = await createUnverifiedClient()
    const token = profile.email_verification_token!
    await verifyClientEmail(supabase, token)
    const second = await verifyClientEmail(supabase, token)
    expect(second.ok).toBe(false)
  })
})
