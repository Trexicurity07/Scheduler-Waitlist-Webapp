import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from './test-helpers'
import type { ClaimedBusiness } from './claim-businesses'

const mockSendExpiryEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendExpiryEmail: (...args: unknown[]) => mockSendExpiryEmail(...args),
}))

import { expireWaitlistEntries } from './waitlist-housekeeping'

describe('waitlist-housekeeping (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []
  const clientCleanups: string[] = []

  beforeEach(() => {
    mockSendExpiryEmail.mockReset()
  })

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (clientCleanups.length > 0) {
      await cleanupTestClient(supabase, clientCleanups.pop()!)
    }
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
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId, {
        status: 'active',
        expires_at: '2026-06-01T00:00:00Z',
      })
      clientCleanups.push(clientUserId)
      await supabase.from('client_profiles').update({ email: 'expiring@example.com' }).eq('user_id', clientUserId)

      await expireWaitlistEntries(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('expired')
      expect(mockSendExpiryEmail).toHaveBeenCalledWith('expiring@example.com', expect.objectContaining({ businessName: business.name }))
    })

    it('does not touch an active entry that has not yet expired', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId, {
        status: 'active',
        expires_at: '2026-07-01T00:00:00Z',
      })
      clientCleanups.push(clientUserId)

      await expireWaitlistEntries(supabase, business, new Date('2026-06-23T00:00:00Z'))

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('active')
      expect(mockSendExpiryEmail).not.toHaveBeenCalled()
    })
  })
})
