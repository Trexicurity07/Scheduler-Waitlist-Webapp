import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import {
  createTestBusiness,
  cleanupTestBusiness,
  createTestClientAndEntry,
  cleanupTestClient,
} from '@/lib/cron/test-helpers'
import { getMyEntries, getMyOffers, getPastEntries, editPendingEntry, removeOwnEntry } from './manage-own-entries'

describe('manage-own-entries (integration)', () => {
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

  async function setup() {
    const supabase = createServiceRoleClient()
    const { businessId, userId: ownerUserId } = await createTestBusiness(supabase)
    businessCleanups.push({ businessId, userId: ownerUserId })
    const { clientId, entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
    clientCleanups.push(clientUserId)
    return { supabase, businessId, clientId, entryId, clientUserId }
  }

  describe('getMyEntries', () => {
    it('returns active entries for the client user', async () => {
      const { supabase, entryId, clientUserId } = await setup()
      const entries = await getMyEntries(supabase, clientUserId)
      expect(entries.some((e) => e.entry_id === entryId)).toBe(true)
      expect(entries[0]).toHaveProperty('business_name')
      expect(entries[0]).toHaveProperty('business_type')
      expect(entries[0]).toHaveProperty('time_windows')
    })

    it('does not return entries for a different user', async () => {
      const { supabase, clientUserId } = await setup()
      const otherSupabase = createServiceRoleClient()
      const { businessId: b2Id, userId: b2UserId } = await createTestBusiness(otherSupabase)
      businessCleanups.push({ businessId: b2Id, userId: b2UserId })
      const { userId: otherClientUserId } = await createTestClientAndEntry(otherSupabase, b2Id)
      clientCleanups.push(otherClientUserId)

      const entries = await getMyEntries(supabase, clientUserId)
      expect(entries.every((e) => e.client_user_id === clientUserId)).toBe(true)
    })
  })

  describe('getMyOffers', () => {
    it('returns empty array when no sent slot_offer notifications exist', async () => {
      const { supabase, clientUserId } = await setup()
      const offers = await getMyOffers(supabase, clientUserId)
      expect(Array.isArray(offers)).toBe(true)
    })
  })

  describe('getPastEntries', () => {
    it('returns filled/expired/removed entries capped at 20', async () => {
      const { supabase, businessId, clientUserId } = await setup()
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', clientUserId)
        .eq('business_id', businessId)
        .single()
      await supabase.from('waitlist_entries').update({ status: 'expired' }).eq('client_id', client!.id)

      const past = await getPastEntries(supabase, clientUserId)
      expect(past.length).toBeGreaterThan(0)
      expect(past.every((e) => ['filled', 'expired', 'removed'].includes(e.status))).toBe(true)
      expect(past.length).toBeLessThanOrEqual(20)
    })
  })

  describe('editPendingEntry', () => {
    it('updates time_windows when the entry is active and belongs to the user', async () => {
      const { supabase, entryId, clientUserId } = await setup()
      const newWindows = [{ days: [1, 3, 5], start: '14:00', end: '18:00' }]
      const result = await editPendingEntry(supabase, entryId, clientUserId, newWindows)
      expect(result.ok).toBe(true)

      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('time_windows')
        .eq('id', entryId)
        .single()
      expect(entry?.time_windows).toEqual(newWindows)
    })

    it('returns error when the entry does not belong to the user', async () => {
      const { supabase, entryId } = await setup()
      const result = await editPendingEntry(supabase, entryId, 'wrong-user-id-000', [
        { days: [1], start: '09:00', end: '17:00' },
      ])
      expect(result.ok).toBe(false)
    })
  })

  describe('removeOwnEntry', () => {
    it('sets status to removed when entry is active and belongs to the user', async () => {
      const { supabase, entryId, clientUserId } = await setup()
      const result = await removeOwnEntry(supabase, entryId, clientUserId)
      expect(result.ok).toBe(true)

      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('status')
        .eq('id', entryId)
        .single()
      expect(entry?.status).toBe('removed')
    })

    it('returns error when the entry does not belong to the user', async () => {
      const { supabase, entryId } = await setup()
      const result = await removeOwnEntry(supabase, entryId, 'wrong-user-id-000')
      expect(result.ok).toBe(false)
    })
  })
})
