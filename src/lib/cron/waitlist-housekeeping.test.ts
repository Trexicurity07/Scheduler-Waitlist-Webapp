import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry } from './test-helpers'
import type { ClaimedBusiness } from './claim-businesses'

const mockSendExpiryEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendExpiryEmail: (...args: unknown[]) => mockSendExpiryEmail(...args),
}))

import { expireWaitlistEntries, removeUnverifiedSignups } from './waitlist-housekeeping'

describe('waitlist-housekeeping (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendExpiryEmail.mockReset()
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
    const { data: row } = await supabase.from('businesses').select('*').eq('id', businessId).single()
    return { supabase, business: row as ClaimedBusiness, businessId }
  }

  describe('expireWaitlistEntries', () => {
    it('marks an active entry past its expiry date as expired and emails the client', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId, clientId } = await createTestClientAndEntry(supabase, businessId, {
        status: 'active',
        expires_at: '2026-06-01T00:00:00Z',
      })
      await supabase.from('clients').update({ email: 'expiring@example.com' }).eq('id', clientId)

      await expireWaitlistEntries(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('expired')
      expect(mockSendExpiryEmail).toHaveBeenCalledWith('expiring@example.com', expect.objectContaining({ businessName: business.name }))
    })

    it('does not touch an active entry that has not yet expired', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId } = await createTestClientAndEntry(supabase, businessId, {
        status: 'active',
        expires_at: '2026-07-01T00:00:00Z',
      })

      await expireWaitlistEntries(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('active')
      expect(mockSendExpiryEmail).not.toHaveBeenCalled()
    })
  })

  describe('removeUnverifiedSignups', () => {
    it('marks a pending_verification entry older than 48 hours as removed', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId } = await createTestClientAndEntry(supabase, businessId, { status: 'pending_verification' })
      await supabase
        .from('waitlist_entries')
        .update({ created_at: '2026-06-20T00:00:00Z' })
        .eq('id', entryId)

      await removeUnverifiedSignups(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('removed')
    })

    it('does not touch a pending_verification entry created within the last 48 hours', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId } = await createTestClientAndEntry(supabase, businessId, { status: 'pending_verification' })
      await supabase
        .from('waitlist_entries')
        .update({ created_at: '2026-06-22T12:00:00Z' })
        .eq('id', entryId)

      await removeUnverifiedSignups(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('pending_verification')
    })
  })
})
