import { describe, it, expect, afterEach, vi } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness, createTestClientAndEntry, cleanupTestClient } from '@/lib/cron/test-helpers'
import { getOfferDetails, confirmOffer, declineOffer } from './confirm-offer'
import type { CalendarProvider, CreateEventInput, CalendarEvent } from '@/lib/calendar/provider'

function fakeProvider(createEventImpl?: CalendarProvider['createEvent']): CalendarProvider {
  return {
    listCalendars: async () => [],
    createCalendar: async () => {
      throw new Error('not used in this test')
    },
    getCalendarTimezone: async () => 'UTC',
    listChangedEvents: async () => [],
    createEvent:
      createEventImpl ??
      (async (_calendarId: string, input: CreateEventInput): Promise<CalendarEvent> => ({
        providerEventId: 'evt-new',
        summary: input.summary,
        startTime: input.startTime,
        endTime: input.endTime,
        status: 'confirmed',
      })),
  }
}

describe('confirm-offer (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []
  const clientCleanups: string[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (clientCleanups.length > 0) await cleanupTestClient(supabase, clientCleanups.pop()!)
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  async function setupOffer(
    opts: {
      notificationStatus?: string
      appointmentStatus?: string
      startTime?: string
      minConfirmLeadHours?: number
    } = {}
  ) {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase, {
      min_confirm_lead_hours: opts.minConfirmLeadHours ?? 12,
      min_notice_hours: 24,
    })
    cleanups.push({ businessId, userId })
    const { entryId, userId: clientUserId } = await createTestClientAndEntry(supabase, businessId)
    clientCleanups.push(clientUserId)
    await supabase
      .from('client_profiles')
      .update({ email: 'client@example.com', name: 'Jane Doe', phone: '15559876543' })
      .eq('user_id', clientUserId)

    const { data: appointment } = await supabase
      .from('appointments')
      .insert({
        business_id: businessId,
        google_event_id: `evt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        summary: 'Haircut',
        start_time: opts.startTime ?? '2026-08-01T10:00:00Z',
        end_time: '2026-08-01T11:00:00Z',
        status: opts.appointmentStatus ?? 'cancelled',
      })
      .select('id')
      .single()

    const token = `tok-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await supabase.from('notifications').insert({
      waitlist_entry_id: entryId,
      appointment_id: appointment!.id,
      type: 'slot_offer',
      status: opts.notificationStatus ?? 'sent',
      token,
      batch_number: 1,
    })

    return { supabase, businessId, entryId, appointmentId: appointment!.id, token }
  }

  describe('getOfferDetails', () => {
    it('returns slot details for an open, eligible offer', async () => {
      const { supabase, token } = await setupOffer()
      const result = await getOfferDetails(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result.ok).toBe(true)
      if (!result.ok) throw new Error('expected ok')
      expect(result.details.businessName).toBe('Test Business')
      expect(result.details.slotDescription).toBe('Haircut')
      expect(new Date(result.details.startTime).toISOString()).toBe('2026-08-01T10:00:00.000Z')
      expect(new Date(result.details.endTime).toISOString()).toBe('2026-08-01T11:00:00.000Z')
    })

    it('returns invalid for an unknown token', async () => {
      const supabase = createServiceRoleClient()
      const result = await getOfferDetails(supabase, 'no-such-token', new Date())
      expect(result).toEqual({ ok: false, reason: 'invalid' })
    })

    it('returns gone when the appointment is no longer cancelled', async () => {
      const { supabase, token } = await setupOffer({ appointmentStatus: 'confirmed' })
      const result = await getOfferDetails(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'gone' })
    })

    it('returns gone when fewer than min_confirm_lead_hours remain before the slot', async () => {
      const { supabase, token } = await setupOffer({ startTime: '2026-08-01T10:00:00Z', minConfirmLeadHours: 12 })
      const result = await getOfferDetails(supabase, token, new Date('2026-08-01T01:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'gone' })
    })

    it.each([
      ['confirmed', 'already_confirmed'],
      ['declined', 'already_declined'],
      ['expired', 'expired'],
      ['superseded', 'gone'],
    ] as const)('maps notification status %s to reason %s', async (notificationStatus, reason) => {
      const { supabase, token } = await setupOffer({ notificationStatus })
      const result = await getOfferDetails(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: false, reason })
    })
  })

  describe('confirmOffer', () => {
    it('creates the replacement event, fills the entry, and supersedes sibling offers', async () => {
      const { supabase, entryId, appointmentId, token } = await setupOffer()

      const { data: sibling } = await supabase
        .from('notifications')
        .insert({
          waitlist_entry_id: entryId,
          appointment_id: appointmentId,
          type: 'slot_offer',
          status: 'sent',
          token: `${token}-sibling`,
          batch_number: 1,
        })
        .select('id')
        .single()

      const mockCreateEvent = vi.fn(async (_calendarId: string, input: CreateEventInput): Promise<CalendarEvent> => ({
        providerEventId: 'evt-new',
        summary: input.summary,
        startTime: input.startTime,
        endTime: input.endTime,
        status: 'confirmed',
      }))

      const result = await confirmOffer(supabase, token, fakeProvider(mockCreateEvent), new Date('2026-07-01T00:00:00Z'))

      expect(result).toEqual({ ok: true })
      expect(mockCreateEvent).toHaveBeenCalledWith(
        'calendar-placeholder',
        expect.objectContaining({ summary: 'Haircut', description: expect.stringContaining('Jane Doe') })
      )

      const { data: entry } = await supabase.from('waitlist_entries').select('status').eq('id', entryId).single()
      expect(entry?.status).toBe('filled')

      const { data: siblingRow } = await supabase.from('notifications').select('status').eq('id', sibling!.id).single()
      expect(siblingRow?.status).toBe('superseded')
    })

    it('rejects a second confirm attempt on the same notification', async () => {
      const { supabase, token } = await setupOffer()
      const first = await confirmOffer(supabase, token, fakeProvider(), new Date('2026-07-01T00:00:00Z'))
      expect(first).toEqual({ ok: true })

      const second = await confirmOffer(supabase, token, fakeProvider(), new Date('2026-07-01T00:00:00Z'))
      expect(second).toEqual({ ok: false, reason: 'already_confirmed' })
    })

    it('rejects confirm when a sibling notification already confirmed the same appointment', async () => {
      const { supabase, entryId, appointmentId, token } = await setupOffer()
      await supabase.from('notifications').insert({
        waitlist_entry_id: entryId,
        appointment_id: appointmentId,
        type: 'slot_offer',
        status: 'confirmed',
        token: `${token}-sibling-confirmed`,
        batch_number: 1,
      })

      const result = await confirmOffer(supabase, token, fakeProvider(), new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'gone' })
    })

    it('rejects confirm when fewer than min_confirm_lead_hours remain', async () => {
      const { supabase, token } = await setupOffer({ minConfirmLeadHours: 12 })
      const result = await confirmOffer(supabase, token, fakeProvider(), new Date('2026-08-01T01:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'gone' })
    })

    it('returns invalid for an unknown token', async () => {
      const supabase = createServiceRoleClient()
      const result = await confirmOffer(supabase, 'no-such-token', fakeProvider(), new Date())
      expect(result).toEqual({ ok: false, reason: 'invalid' })
    })
  })

  describe('declineOffer', () => {
    it('marks the notification declined', async () => {
      const { supabase, token } = await setupOffer()
      const result = await declineOffer(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: true })

      const { data } = await supabase.from('notifications').select('status, responded_at').eq('token', token).single()
      expect(data?.status).toBe('declined')
      expect(data?.responded_at).toBeTruthy()
    })

    it('rejects declining a notification that was already declined', async () => {
      const { supabase, token } = await setupOffer({ notificationStatus: 'declined' })
      const result = await declineOffer(supabase, token, new Date('2026-07-01T00:00:00Z'))
      expect(result).toEqual({ ok: false, reason: 'already_declined' })
    })
  })
})
