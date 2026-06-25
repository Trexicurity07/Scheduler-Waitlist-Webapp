import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'

// sendVerificationEmail (via the real `resend` SDK) requires RESEND_API_KEY,
// which is not populated with a real secret in local/CI environments for this
// phase. Mock the same way src/lib/notifications/email.test.ts already does,
// so this integration test exercises real Supabase but never makes a real
// Resend network call.
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

describe('signupClient (integration)', () => {
  const createdUserIds: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    for (const id of createdUserIds.splice(0)) {
      await supabase.auth.admin.deleteUser(id)
    }
  })

  it('creates an auth user and client_profiles row and returns ok: true', async () => {
    const supabase = createServiceRoleClient()
    const email = `signup-test-${Date.now()}@example.com`
    const result = await signupClient(supabase, {
      name: 'Jane Doe',
      email,
      phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`,
      password: 'SecurePass1',
    })

    expect(result.ok).toBe(true)

    const { data: profile } = await supabase.from('client_profiles').select('name, verified_at').eq('email', email).single()
    expect(profile?.name).toBe('Jane Doe')
    expect(profile?.verified_at).toBeNull()

    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)
    expect(user).toBeDefined()
    createdUserIds.push(user!.id)
  })

  it('returns error when email is already taken', async () => {
    const supabase = createServiceRoleClient()
    const email = `dup-email-${Date.now()}@example.com`
    const phone1 = `1555${Math.floor(1000000 + Math.random() * 8999999)}`
    const phone2 = `1555${Math.floor(1000000 + Math.random() * 8999999)}`

    const first = await signupClient(supabase, { name: 'Alice', email, phone: phone1, password: 'SecurePass1' })
    expect(first.ok).toBe(true)

    const second = await signupClient(supabase, { name: 'Bob', email, phone: phone2, password: 'SecurePass1' })
    expect(second.ok).toBe(false)
    expect((second as { ok: false; error: string }).error).toMatch(/email/i)

    const { data: users } = await supabase.auth.admin.listUsers()
    const user = users.users.find((u) => u.email === email)
    if (user) createdUserIds.push(user.id)
  })

  it('returns error when phone is already taken', async () => {
    const supabase = createServiceRoleClient()
    const email1 = `phone-dup-a-${Date.now()}@example.com`
    const email2 = `phone-dup-b-${Date.now()}@example.com`
    const phone = `1555${Math.floor(1000000 + Math.random() * 8999999)}`

    const first = await signupClient(supabase, { name: 'Alice', email: email1, phone, password: 'SecurePass1' })
    expect(first.ok).toBe(true)

    const second = await signupClient(supabase, { name: 'Bob', email: email2, phone, password: 'SecurePass1' })
    expect(second.ok).toBe(false)
    expect((second as { ok: false; error: string }).error).toMatch(/phone/i)

    const { data: users } = await supabase.auth.admin.listUsers()
    const u1 = users.users.find((u) => u.email === email1)
    const u2 = users.users.find((u) => u.email === email2)
    if (u1) createdUserIds.push(u1.id)
    if (u2) createdUserIds.push(u2.id)
  })
})
