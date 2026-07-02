import { randomUUID } from 'crypto'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'

vi.mock('@/lib/notifications/email', () => ({
  sendSignupCodeEmail: vi.fn().mockResolvedValue(undefined),
}))

import { signupClient } from './signup-client'

describe('signupClient (integration)', () => {
  const createdEmails: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    for (const email of createdEmails.splice(0)) {
      await supabase.from('pending_signups').delete().eq('email', email)
      await supabase.from('client_profiles').delete().eq('email', email)
    }
  })

  it('inserts a pending_signups row with correct fields', async () => {
    const supabase = createServiceRoleClient()
    const email = `signup-test-${Date.now()}@example.com`
    createdEmails.push(email)

    const result = await signupClient(supabase, {
      name: 'Jane Doe',
      email,
      phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`,
      password: 'SecurePass1',
    })

    expect(result.ok).toBe(true)

    const { data: pending } = await supabase
      .from('pending_signups')
      .select('account_type, name, email')
      .eq('email', email.toLowerCase())
      .single()
    expect(pending?.account_type).toBe('client')
    expect(pending?.name).toBe('Jane Doe')
  })

  it('returns error when email is already registered in client_profiles', async () => {
    const supabase = createServiceRoleClient()
    const email = `dup-email-${Date.now()}@example.com`
    const phone1 = `1555${Math.floor(1000000 + Math.random() * 8999999)}`
    const phone2 = `1555${Math.floor(1000000 + Math.random() * 8999999)}`
    createdEmails.push(email)

    await supabase.from('client_profiles').insert({ user_id: randomUUID(), name: 'Alice', email, phone: phone1 })

    const result = await signupClient(supabase, { name: 'Bob', email, phone: phone2, password: 'SecurePass1' })
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toMatch(/email/i)
  })

  it('returns error when phone is already registered in client_profiles', async () => {
    const supabase = createServiceRoleClient()
    const email1 = `phone-dup-a-${Date.now()}@example.com`
    const email2 = `phone-dup-b-${Date.now()}@example.com`
    const phone = `1555${Math.floor(1000000 + Math.random() * 8999999)}`
    createdEmails.push(email1)
    createdEmails.push(email2)

    await supabase.from('client_profiles').insert({ user_id: randomUUID(), name: 'Alice', email: email1, phone })

    const result = await signupClient(supabase, { name: 'Bob', email: email2, phone, password: 'SecurePass1' })
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toMatch(/phone/i)
  })
})
