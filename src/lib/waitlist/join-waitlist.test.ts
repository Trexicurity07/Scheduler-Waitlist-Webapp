import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from '@/lib/cron/test-helpers'

const mockSendVerificationEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendVerificationEmail: (...args: unknown[]) => mockSendVerificationEmail(...args),
}))

import { joinWaitlist } from './join-waitlist'

describe('joinWaitlist (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendVerificationEmail.mockReset()
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
  })

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupBusiness() {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })
    const { data: business } = await supabase.from('businesses').select('public_slug').eq('id', businessId).single()
    return { supabase, businessId, slug: business!.public_slug }
  }

  it('creates a pending_verification entry and sends a verification email', async () => {
    const { supabase, slug } = await setupBusiness()

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Alice Client',
      email: 'alice@example.com',
      phone: '15551112222',
      timeWindows: [{ days: [1, 3], start: '09:00', end: '17:00' }],
    })

    expect(result).toEqual({ ok: true })
    const { data: entry } = await supabase
      .from('waitlist_entries')
      .select('status, email_verification_token, clients(email)')
      .eq('client_id', (await supabase.from('clients').select('id').eq('email', 'alice@example.com').single()).data!.id)
      .single()
    expect(entry?.status).toBe('pending_verification')
    expect(entry?.email_verification_token).toBeTruthy()
    expect(mockSendVerificationEmail).toHaveBeenCalledWith(
      'alice@example.com',
      expect.objectContaining({ verifyUrl: expect.stringContaining(entry!.email_verification_token!) })
    )
  })

  it('rejects a signup when the email already has an active entry at that business', async () => {
    const { supabase, slug } = await setupBusiness()
    await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Bob Client',
      email: 'bob@example.com',
      phone: '15553334444',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })
    await supabase.from('waitlist_entries').update({ status: 'active' }).eq(
      'client_id',
      (await supabase.from('clients').select('id').eq('email', 'bob@example.com').single()).data!.id
    )

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Bob Client',
      email: 'bob@example.com',
      phone: '15559998888',
      timeWindows: [{ days: [2], start: '09:00', end: '17:00' }],
    })

    expect(result.ok).toBe(false)
  })

  it('rejects a signup when the phone already has an active entry at that business', async () => {
    const { supabase, slug } = await setupBusiness()
    await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Carol Client',
      email: 'carol@example.com',
      phone: '15550001111',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })
    await supabase.from('waitlist_entries').update({ status: 'active' }).eq(
      'client_id',
      (await supabase.from('clients').select('id').eq('email', 'carol@example.com').single()).data!.id
    )

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Carol Client',
      email: 'carol-other@example.com',
      phone: '15550001111',
      timeWindows: [{ days: [2], start: '09:00', end: '17:00' }],
    })

    expect(result.ok).toBe(false)
  })

  it('reuses the existing client record when email and phone both match exactly, even after the prior entry was removed', async () => {
    const { supabase, slug } = await setupBusiness()
    await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Eve Client',
      email: 'eve@example.com',
      phone: '15552223333',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })
    const { data: firstClient } = await supabase.from('clients').select('id').eq('email', 'eve@example.com').single()
    await supabase.from('waitlist_entries').update({ status: 'removed' }).eq('client_id', firstClient!.id)

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Eve Client',
      email: 'eve@example.com',
      phone: '15552223333',
      timeWindows: [{ days: [2], start: '09:00', end: '17:00' }],
    })

    expect(result).toEqual({ ok: true })
    const { data: clients } = await supabase.from('clients').select('id').eq('email', 'eve@example.com')
    expect(clients).toHaveLength(1)
  })

  it('rejects a signup whose email matches an existing client but phone differs, even when that client has no active entry', async () => {
    const { supabase, slug } = await setupBusiness()
    await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Frank Client',
      email: 'frank@example.com',
      phone: '15554445555',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Frank Client',
      email: 'frank@example.com',
      phone: '15556667777',
      timeWindows: [{ days: [2], start: '09:00', end: '17:00' }],
    })

    expect(result.ok).toBe(false)
  })

  it('rejects a signup whose phone matches an existing client but email differs, even when that client has no active entry', async () => {
    const { supabase, slug } = await setupBusiness()
    await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Grace Client',
      email: 'grace@example.com',
      phone: '15558889999',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })

    const result = await joinWaitlist(supabase, {
      businessSlug: slug,
      name: 'Grace Client',
      email: 'grace-other@example.com',
      phone: '15558889999',
      timeWindows: [{ days: [2], start: '09:00', end: '17:00' }],
    })

    expect(result.ok).toBe(false)
  })

  it('returns an error when the business slug does not exist', async () => {
    const supabase = createServiceRoleClient()
    const result = await joinWaitlist(supabase, {
      businessSlug: 'no-such-business',
      name: 'Dana Client',
      email: 'dana@example.com',
      phone: '15557776666',
      timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
    })
    expect(result).toEqual({ ok: false, error: 'Business not found' })
  })
})
