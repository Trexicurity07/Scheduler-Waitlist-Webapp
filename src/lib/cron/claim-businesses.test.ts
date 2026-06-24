import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from './test-helpers'
import { claimBusinesses, releaseBusiness } from './claim-businesses'

describe('claimBusinesses / releaseBusiness (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  it('claims a business with no existing lock', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const claimed = await claimBusinesses(supabase, new Date())
    expect(claimed.map((b) => b.id)).toContain(businessId)
  })

  it('does not claim a business with a fresh lock', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, {
      processing_started_at: new Date().toISOString(),
    })
    cleanups.push({ businessId, userId })

    const claimed = await claimBusinesses(supabase, new Date())
    expect(claimed.map((b) => b.id)).not.toContain(businessId)
  })

  it('claims a business with a stale lock (older than 4 minutes)', async () => {
    const supabase = createServiceRoleClient()
    const staleLock = new Date(Date.now() - 5 * 60 * 1000).toISOString()
    const { businessId, userId } = await createTestBusiness(supabase, { processing_started_at: staleLock })
    cleanups.push({ businessId, userId })

    const claimed = await claimBusinesses(supabase, new Date())
    expect(claimed.map((b) => b.id)).toContain(businessId)
  })

  it('does not claim a disconnected business', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, { calendar_status: 'disconnected' })
    cleanups.push({ businessId, userId })

    const claimed = await claimBusinesses(supabase, new Date())
    expect(claimed.map((b) => b.id)).not.toContain(businessId)
  })

  it('releaseBusiness clears the lock and sets last_checked_at', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const checkedAt = new Date()
    await claimBusinesses(supabase, new Date())
    await releaseBusiness(supabase, businessId, checkedAt)

    const { data } = await supabase
      .from('businesses')
      .select('processing_started_at, last_checked_at')
      .eq('id', businessId)
      .single()
    expect(data?.processing_started_at).toBeNull()
    // Normalize to ISO string for comparison (Supabase may return +00:00 instead of Z)
    expect(new Date(data?.last_checked_at ?? '').toISOString()).toBe(checkedAt.toISOString())
  })
})
