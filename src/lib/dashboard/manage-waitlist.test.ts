import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from '@/lib/cron/test-helpers'

const mockSendOwnerActivityEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendOwnerActivityEmail: (...args: unknown[]) => mockSendOwnerActivityEmail(...args),
}))

import { addWaitlistEntry, removeWaitlistEntry, updateBusinessSettings } from './manage-waitlist'

describe('manage-waitlist (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  beforeEach(() => {
    mockSendOwnerActivityEmail.mockReset()
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
    return { supabase, businessId }
  }

  describe('addWaitlistEntry', () => {
    const clientCleanups: string[] = []
    afterEach(async () => {
      const supabase = createServiceRoleClient()
      for (const id of clientCleanups.splice(0)) await supabase.auth.admin.deleteUser(id)
    })

    async function createClientAccount(supabase: ReturnType<typeof createServiceRoleClient>, email: string, phone: string) {
      const { data: userData } = await supabase.auth.admin.createUser({ email, password: 'TestPass1', email_confirm: true })
      const userId = userData!.user!.id
      clientCleanups.push(userId)
      await supabase.from('client_profiles').insert({
        user_id: userId, name: 'Test Client', email, phone, verified_at: new Date().toISOString(),
      })
      return userId
    }

    it('creates an active entry when the client has an account and notifies them', async () => {
      const { supabase, businessId } = await setupBusiness()
      const email = `manual-${Date.now()}@example.com`
      await createClientAccount(supabase, email, `1555${Math.floor(1000000 + Math.random() * 8999999)}`)

      const result = await addWaitlistEntry(supabase, businessId, {
        identifier: email,
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })
      expect(result).toEqual({ ok: true })

      const { data: entries } = await supabase
        .from('waitlist_entries')
        .select('status, clients!inner(user_id, client_profiles!inner(email))')
        .eq('business_id', businessId)
        .eq('status', 'active')
      expect(entries?.length).toBe(1)
      expect(mockSendOwnerActivityEmail).toHaveBeenCalledWith(
        email,
        expect.objectContaining({ action: 'added' })
      )
    })

    it('returns error when no account exists for the identifier', async () => {
      const { supabase, businessId } = await setupBusiness()
      const result = await addWaitlistEntry(supabase, businessId, {
        identifier: 'nosuchclient@example.com',
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })
      expect(result.ok).toBe(false)
      expect((result as { ok: false; error: string }).error).toMatch(/sign up first/i)
    })

    it('rejects adding a client that already has an active entry', async () => {
      const { supabase, businessId } = await setupBusiness()
      const email = `dup-${Date.now()}@example.com`
      await createClientAccount(supabase, email, `1555${Math.floor(1000000 + Math.random() * 8999999)}`)

      await addWaitlistEntry(supabase, businessId, { identifier: email, timeWindows: [{ days: [1], start: '09:00', end: '17:00' }] })
      const result = await addWaitlistEntry(supabase, businessId, { identifier: email, timeWindows: [{ days: [2], start: '09:00', end: '17:00' }] })
      expect(result.ok).toBe(false)
    })
  })

  describe('removeWaitlistEntry', () => {
    const clientCleanups: string[] = []
    afterEach(async () => {
      const supabase = createServiceRoleClient()
      for (const id of clientCleanups.splice(0)) await supabase.auth.admin.deleteUser(id)
    })

    async function createClientAccount(supabase: ReturnType<typeof createServiceRoleClient>, email: string, phone: string) {
      const { data: userData } = await supabase.auth.admin.createUser({ email, password: 'TestPass1', email_confirm: true })
      const userId = userData!.user!.id
      clientCleanups.push(userId)
      await supabase.from('client_profiles').insert({
        user_id: userId, name: 'Test Client', email, phone, verified_at: new Date().toISOString(),
      })
      return userId
    }

    it('marks the entry removed and notifies the client', async () => {
      const { supabase, businessId } = await setupBusiness()
      const email = `removable-${Date.now()}@example.com`
      await createClientAccount(supabase, email, `1555${Math.floor(1000000 + Math.random() * 8999999)}`)
      await addWaitlistEntry(supabase, businessId, {
        identifier: email,
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })
      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('id, clients!inner(client_profiles!inner(email))')
        .eq('business_id', businessId)
        .eq('status', 'active')
        .single()

      const result = await removeWaitlistEntry(supabase, businessId, entry!.id)

      expect(result).toEqual({ ok: true })
      const { data: updated } = await supabase
        .from('waitlist_entries')
        .select('status')
        .eq('id', entry!.id)
        .single()
      expect(updated?.status).toBe('removed')
      expect(mockSendOwnerActivityEmail).toHaveBeenCalledWith(
        email,
        expect.objectContaining({ action: 'removed' })
      )
    })

    it('rejects removing an entry that belongs to a different business', async () => {
      const { supabase, businessId } = await setupBusiness()
      const { businessId: otherBusinessId, userId: otherUserId } = await createTestBusiness(supabase)
      cleanups.push({ businessId: otherBusinessId, userId: otherUserId })

      const email = `other-${Date.now()}@example.com`
      await createClientAccount(supabase, email, `1555${Math.floor(1000000 + Math.random() * 8999999)}`)
      await addWaitlistEntry(supabase, otherBusinessId, {
        identifier: email,
        timeWindows: [{ days: [1], start: '09:00', end: '17:00' }],
      })
      const { data: entry } = await supabase
        .from('waitlist_entries')
        .select('id, clients!inner(client_profiles!inner(email))')
        .eq('business_id', otherBusinessId)
        .eq('status', 'active')
        .single()

      const result = await removeWaitlistEntry(supabase, businessId, entry!.id)
      expect(result).toEqual({ ok: false, error: 'Waitlist entry not found' })
    })
  })

  describe('updateBusinessSettings', () => {
    it('updates the configurable thresholds', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await updateBusinessSettings(supabase, businessId, {
        batchSize: 5,
        batchIntervalMinutes: 45,
        minNoticeHours: 36,
        minConfirmLeadHours: 18,
      })

      expect(result).toEqual({ ok: true })
      const { data: business } = await supabase
        .from('businesses')
        .select('batch_size, batch_interval_minutes, min_notice_hours, min_confirm_lead_hours')
        .eq('id', businessId)
        .single()
      expect(business).toEqual({
        batch_size: 5,
        batch_interval_minutes: 45,
        min_notice_hours: 36,
        min_confirm_lead_hours: 18,
      })
    })

    it('rejects settings where confirm lead time is not less than notice hours', async () => {
      const { supabase, businessId } = await setupBusiness()

      const result = await updateBusinessSettings(supabase, businessId, {
        batchSize: 3,
        batchIntervalMinutes: 30,
        minNoticeHours: 12,
        minConfirmLeadHours: 12,
      })

      expect(result).toEqual({
        ok: false,
        error: 'Confirmation lead time must be less than the minimum notice period.',
      })
    })
  })
})
