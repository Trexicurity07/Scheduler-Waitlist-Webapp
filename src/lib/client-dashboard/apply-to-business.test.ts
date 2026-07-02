import { randomUUID } from 'crypto'
import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from '@/lib/cron/test-helpers'
import { applyToBusiness } from './apply-to-business'

describe('applyToBusiness (integration)', () => {
  const businessCleanups: { businessId: string; userId: string }[] = []
  const clientCleanups: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (clientCleanups.length > 0) await cleanupTestClient(supabase, clientCleanups.pop()!)
    while (businessCleanups.length > 0) {
      const next = businessCleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  it('creates a clients row and waitlist_entries row on first apply', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId: ownerUserId } = await createTestBusiness(supabase)
    businessCleanups.push({ businessId, userId: ownerUserId })

    const slug = (await supabase.from('businesses').select('public_slug').eq('id', businessId).single()).data!.public_slug

    const clientEmail = `apply-test-${Date.now()}@example.com`
    const clientUserId = randomUUID()
    clientCleanups.push(clientUserId)
    await supabase.from('client_profiles').insert({
      user_id: clientUserId, name: 'Applicant', email: clientEmail,
      phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`,
    })

    const result = await applyToBusiness(supabase, clientUserId, slug, [{ days: [1, 2, 3, 4, 5], start: '09:00', end: '17:00' }])
    expect(result.ok).toBe(true)

    const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('business_id', businessId).single()
    expect(entry?.status).toBe('active')
  })

  it('returns error when client already has an active entry for the same business', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId: ownerUserId } = await createTestBusiness(supabase)
    businessCleanups.push({ businessId, userId: ownerUserId })

    const slug = (await supabase.from('businesses').select('public_slug').eq('id', businessId).single()).data!.public_slug

    const { userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
    clientCleanups.push(clientUserId)

    const result = await applyToBusiness(supabase, clientUserId, slug, [{ days: [0, 6], start: '10:00', end: '18:00' }])
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toMatch(/already on the waitlist/i)
  })

  it('returns error when business slug is not found', async () => {
    const supabase = createServiceRoleClient()
    const clientEmail = `apply-notfound-${Date.now()}@example.com`
    const clientUserId = randomUUID()
    clientCleanups.push(clientUserId)
    await supabase.from('client_profiles').insert({
      user_id: clientUserId, name: 'Ghost', email: clientEmail,
      phone: `1555${Math.floor(1000000 + Math.random() * 8999999)}`,
    })

    const result = await applyToBusiness(supabase, clientUserId, 'no-such-slug-xyz', [{ days: [1], start: '09:00', end: '17:00' }])
    expect(result.ok).toBe(false)
    expect((result as { ok: false; error: string }).error).toMatch(/not found/i)
  })
})
