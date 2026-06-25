import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from './test-helpers'
import type { ClaimedBusiness } from './claim-businesses'

const mockSendSlotOfferEmail = vi.fn()
const mockSendSlotGoneEmail = vi.fn()

vi.mock('@/lib/notifications/email', () => ({
  sendSlotOfferEmail: (...args: unknown[]) => mockSendSlotOfferEmail(...args),
  sendSlotGoneEmail: (...args: unknown[]) => mockSendSlotGoneEmail(...args),
}))

import { resolveStaleOffers, expireTimedOutOffers, dispatchPendingOffers } from './dispatch-offers'

function toClaimedBusiness(row: {
  id: string
  owner_user_id: string
  name: string
  public_slug: string
  whatsapp_number: string
  timezone: string
  dedicated_calendar_id: string
  google_refresh_token_encrypted: string
  last_checked_at: string | null
  batch_size: number
  batch_interval_minutes: number
  min_notice_hours: number
  min_confirm_lead_hours: number
}): ClaimedBusiness {
  return row
}

describe('dispatch-offers (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []
  const clientCleanups: string[] = []

  beforeEach(() => {
    mockSendSlotOfferEmail.mockReset()
    mockSendSlotGoneEmail.mockReset()
    process.env.NEXT_PUBLIC_APP_URL = 'https://example.com'
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

  async function setupBusiness(overrides: Record<string, unknown> = {}) {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, overrides)
    cleanups.push({ businessId, userId })
    const { data: row } = await supabase.from('businesses').select('*').eq('id', businessId).single()
    return { supabase, business: toClaimedBusiness(row!), businessId, userId }
  }

  describe('resolveStaleOffers', () => {
    it('supersedes a sent offer and emails the client when the slot is retaken by a confirmed appointment', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
      clientCleanups.push(clientUserId)
      await supabase.from('client_profiles').update({ email: 'client@example.com' }).eq('user_id', clientUserId)

      const { data: cancelledAppt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-cancelled',
          start_time: '2026-08-01T10:00:00Z',
          end_time: '2026-08-01T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await supabase.from('appointments').insert({
        business_id: businessId,
        google_event_id: 'evt-rebooked',
        start_time: '2026-08-01T10:00:00Z',
        end_time: '2026-08-01T11:00:00Z',
        status: 'confirmed',
      })

      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: cancelledAppt!.id,
          type: 'slot_offer',
          status: 'sent',
          token: 'tok-stale-1',
          batch_number: 1,
        })
        .select('id')
        .single()

      await resolveStaleOffers(supabase, business)

      const { data: updated } = await supabase
        .from('notifications')
        .select('status')
        .eq('id', notification!.id)
        .single()
      expect(updated?.status).toBe('superseded')
      expect(mockSendSlotGoneEmail).toHaveBeenCalledWith('client@example.com', expect.objectContaining({ businessName: business.name }))
    })

    it('leaves a sent offer untouched when no overlapping confirmed appointment exists', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
      clientCleanups.push(clientUserId)

      const { data: cancelledAppt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-cancelled-2',
          start_time: '2026-08-02T10:00:00Z',
          end_time: '2026-08-02T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: cancelledAppt!.id,
          type: 'slot_offer',
          status: 'sent',
          token: 'tok-stale-2',
          batch_number: 1,
        })
        .select('id')
        .single()

      await resolveStaleOffers(supabase, business)

      const { data: updated } = await supabase
        .from('notifications')
        .select('status')
        .eq('id', notification!.id)
        .single()
      expect(updated?.status).toBe('sent')
      expect(mockSendSlotGoneEmail).not.toHaveBeenCalled()
    })
  })

  describe('expireTimedOutOffers', () => {
    it('expires a sent offer older than batch_interval_minutes', async () => {
      const { supabase, business, businessId } = await setupBusiness({ batch_interval_minutes: 30 })
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
      clientCleanups.push(clientUserId)
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-timeout-1',
          start_time: '2026-08-03T10:00:00Z',
          end_time: '2026-08-03T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      const sentAt = new Date('2026-07-01T00:00:00Z')
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: appt!.id,
          type: 'slot_offer',
          status: 'sent',
          token: 'tok-timeout-1',
          batch_number: 1,
          sent_at: sentAt.toISOString(),
        })
        .select('id')
        .single()

      const now = new Date(sentAt.getTime() + 31 * 60 * 1000)
      await expireTimedOutOffers(supabase, business, now)

      const { data: updated } = await supabase
        .from('notifications')
        .select('status')
        .eq('id', notification!.id)
        .single()
      expect(updated?.status).toBe('expired')
    })

    it('does not expire a sent offer still within the batch interval', async () => {
      const { supabase, business, businessId } = await setupBusiness({ batch_interval_minutes: 30 })
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
      clientCleanups.push(clientUserId)
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-timeout-2',
          start_time: '2026-08-04T10:00:00Z',
          end_time: '2026-08-04T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      const sentAt = new Date('2026-07-01T00:00:00Z')
      const { data: notification } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: appt!.id,
          type: 'slot_offer',
          status: 'sent',
          token: 'tok-timeout-2',
          batch_number: 1,
          sent_at: sentAt.toISOString(),
        })
        .select('id')
        .single()

      const now = new Date(sentAt.getTime() + 10 * 60 * 1000)
      await expireTimedOutOffers(supabase, business, now)

      const { data: updated } = await supabase
        .from('notifications')
        .select('status')
        .eq('id', notification!.id)
        .single()
      expect(updated?.status).toBe('sent')
    })
  })

  describe('dispatchPendingOffers', () => {
    it('sends a batch to the longest-waiting matching candidate, respecting batch_size', async () => {
      const { supabase, business, businessId } = await setupBusiness({ batch_size: 1 })
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const older = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      clientCleanups.push(older.userId)
      await supabase.from('client_profiles').update({ email: 'older@example.com' }).eq('user_id', older.userId)
      await supabase
        .from('waitlist_entries')
        .update({ created_at: '2026-01-01T00:00:00Z' })
        .eq('id', older.entryId)

      const newer = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      clientCleanups.push(newer.userId)
      await supabase.from('client_profiles').update({ email: 'newer@example.com' }).eq('user_id', newer.userId)
      await supabase
        .from('waitlist_entries')
        .update({ created_at: '2026-06-01T00:00:00Z' })
        .eq('id', newer.entryId)

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-1',
          start_time: '2026-06-26T10:00:00Z',
          end_time: '2026-06-26T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('waitlist_entry_id, batch_number, status')
        .eq('appointment_id', appt!.id)
      expect(notifications).toHaveLength(1)
      expect(notifications![0].waitlist_entry_id).toBe(older.entryId)
      expect(notifications![0].batch_number).toBe(1)
      expect(mockSendSlotOfferEmail).toHaveBeenCalledWith('older@example.com', expect.objectContaining({ businessName: business.name }))
    })

    it('does not send a batch when the slot is closer than min_notice_hours', async () => {
      const { supabase, business, businessId } = await setupBusiness({ min_notice_hours: 24 })
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const { userId: clientUserId } = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      clientCleanups.push(clientUserId)

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-2',
          start_time: '2026-06-23T10:00:00Z',
          end_time: '2026-06-23T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('appointment_id', appt!.id)
      expect(notifications).toHaveLength(0)
      expect(mockSendSlotOfferEmail).not.toHaveBeenCalled()
    })

    it('does not send a new batch while one is already active for the slot', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      clientCleanups.push(clientUserId)

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-3',
          start_time: '2026-06-26T10:00:00Z',
          end_time: '2026-06-26T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await supabase.from('notifications').insert({
        waitlist_entry_id: entryId,
        appointment_id: appt!.id,
        type: 'slot_offer',
        status: 'sent',
        token: 'tok-active-batch',
        batch_number: 1,
      })

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('id')
        .eq('appointment_id', appt!.id)
      expect(notifications).toHaveLength(1)
      expect(mockSendSlotOfferEmail).not.toHaveBeenCalled()
    })

    it('does not re-notify a candidate from an earlier expired batch, and increments batch_number', async () => {
      const { supabase, business, businessId } = await setupBusiness({ batch_size: 1 })
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const first = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      clientCleanups.push(first.userId)
      await supabase.from('client_profiles').update({ email: 'first@example.com' }).eq('user_id', first.userId)
      await supabase.from('waitlist_entries').update({ created_at: '2026-01-01T00:00:00Z' }).eq('id', first.entryId)

      const second = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      clientCleanups.push(second.userId)
      await supabase.from('client_profiles').update({ email: 'second@example.com' }).eq('user_id', second.userId)
      await supabase.from('waitlist_entries').update({ created_at: '2026-02-01T00:00:00Z' }).eq('id', second.entryId)

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-4',
          start_time: '2026-06-26T10:00:00Z',
          end_time: '2026-06-26T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await supabase.from('notifications').insert({
        waitlist_entry_id: first.entryId,
        appointment_id: appt!.id,
        type: 'slot_offer',
        status: 'expired',
        token: 'tok-round-1',
        batch_number: 1,
      })

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('waitlist_entry_id, batch_number')
        .eq('appointment_id', appt!.id)
        .eq('status', 'sent')
      expect(notifications).toHaveLength(1)
      expect(notifications![0].waitlist_entry_id).toBe(second.entryId)
      expect(notifications![0].batch_number).toBe(2)
    })

    it('does not send when the slot has already been filled (a confirmed notification exists)', async () => {
      const { supabase, business, businessId } = await setupBusiness()
      const window = [{ days: [0, 1, 2, 3, 4, 5, 6], start: '00:00', end: '23:59' }]
      const filledEntry = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      clientCleanups.push(filledEntry.userId)
      const otherEntry = await createTestClientAndEntry(supabase, businessId, { time_windows: window })
      clientCleanups.push(otherEntry.userId)

      const now = new Date('2026-06-23T00:00:00Z')
      const { data: appt } = await supabase
        .from('appointments')
        .insert({
          business_id: businessId,
          google_event_id: 'evt-dispatch-5',
          start_time: '2026-06-26T10:00:00Z',
          end_time: '2026-06-26T11:00:00Z',
          status: 'cancelled',
        })
        .select('id')
        .single()

      await supabase.from('notifications').insert({
        waitlist_entry_id: filledEntry.entryId,
        appointment_id: appt!.id,
        type: 'slot_offer',
        status: 'confirmed',
        token: 'tok-confirmed',
        batch_number: 1,
      })

      await dispatchPendingOffers(supabase, business, now)

      const { data: notifications } = await supabase
        .from('notifications')
        .select('waitlist_entry_id')
        .eq('appointment_id', appt!.id)
        .eq('waitlist_entry_id', otherEntry.entryId)
      expect(notifications).toHaveLength(0)
      expect(mockSendSlotOfferEmail).not.toHaveBeenCalled()
    })
  })
})
