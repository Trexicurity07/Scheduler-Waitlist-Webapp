import { describe, it, expect, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { createTestBusiness, cleanupTestBusiness } from './test-helpers'
import { syncAppointments } from './sync-appointments'
import type { CalendarProvider, CalendarEvent, CalendarListEntry, CreateEventInput } from '@/lib/calendar/provider'

function fakeProvider(events: CalendarEvent[]): CalendarProvider {
  return {
    listCalendars: async (): Promise<CalendarListEntry[]> => [],
    createCalendar: async (): Promise<CalendarListEntry> => {
      throw new Error('not implemented')
    },
    getCalendarTimezone: async (): Promise<string> => 'UTC',
    listChangedEvents: async (): Promise<CalendarEvent[]> => events,
    createEvent: async (_calendarId: string, _input: CreateEventInput): Promise<CalendarEvent> => {
      throw new Error('not implemented')
    },
  }
}

describe('syncAppointments (integration)', () => {
  const cleanups: { businessId: string; userId: string }[] = []

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    while (cleanups.length > 0) {
      const next = cleanups.pop()!
      await cleanupTestBusiness(supabase, next.businessId, next.userId)
    }
  })

  it('flags a cancelled event with no prior synced row as newly cancelled', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const provider = fakeProvider([
      {
        providerEventId: 'evt-1',
        summary: 'Haircut',
        startTime: new Date('2026-07-01T10:00:00Z'),
        endTime: new Date('2026-07-01T11:00:00Z'),
        status: 'cancelled',
      },
    ])

    const result = await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-01T00:00:00Z'))
    expect(result.newlyCancelled).toHaveLength(1)
    expect(result.newlyCancelled[0].startTime).toEqual(new Date('2026-07-01T10:00:00Z'))
  })

  it('flags an event that transitions from confirmed to cancelled across two syncs', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const confirmedProvider = fakeProvider([
      {
        providerEventId: 'evt-2',
        summary: 'Massage',
        startTime: new Date('2026-07-02T09:00:00Z'),
        endTime: new Date('2026-07-02T10:00:00Z'),
        status: 'confirmed',
      },
    ])
    const firstResult = await syncAppointments(
      supabase,
      businessId,
      confirmedProvider,
      'cal1',
      new Date('2026-06-01T00:00:00Z')
    )
    expect(firstResult.newlyCancelled).toHaveLength(0)

    const cancelledProvider = fakeProvider([
      {
        providerEventId: 'evt-2',
        summary: 'Massage',
        startTime: new Date('2026-07-02T09:00:00Z'),
        endTime: new Date('2026-07-02T10:00:00Z'),
        status: 'cancelled',
      },
    ])
    const secondResult = await syncAppointments(
      supabase,
      businessId,
      cancelledProvider,
      'cal1',
      new Date('2026-06-02T00:00:00Z')
    )
    expect(secondResult.newlyCancelled).toHaveLength(1)
  })

  it('does not re-flag an event that is already cancelled in the database', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const provider = fakeProvider([
      {
        providerEventId: 'evt-3',
        summary: 'Trim',
        startTime: new Date('2026-07-03T09:00:00Z'),
        endTime: new Date('2026-07-03T09:30:00Z'),
        status: 'cancelled',
      },
    ])

    await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-01T00:00:00Z'))
    const secondResult = await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-02T00:00:00Z'))
    expect(secondResult.newlyCancelled).toHaveLength(0)
  })

  it('upserts a confirmed event without flagging it as cancelled', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const provider = fakeProvider([
      {
        providerEventId: 'evt-4',
        summary: 'Color',
        startTime: new Date('2026-07-04T13:00:00Z'),
        endTime: new Date('2026-07-04T14:30:00Z'),
        status: 'confirmed',
      },
    ])

    const result = await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-01T00:00:00Z'))
    expect(result.newlyCancelled).toHaveLength(0)

    const { data } = await supabase
      .from('appointments')
      .select('status')
      .eq('business_id', businessId)
      .eq('google_event_id', 'evt-4')
      .single()
    expect(data?.status).toBe('confirmed')
  })

  it('handles multiple events in one call, flagging only the cancelled one', async () => {
    const supabase = createServiceRoleClient()
    const { businessId, userId } = await createTestBusiness(supabase)
    cleanups.push({ businessId, userId })

    const provider = fakeProvider([
      {
        providerEventId: 'evt-5',
        summary: 'Cut',
        startTime: new Date('2026-07-05T09:00:00Z'),
        endTime: new Date('2026-07-05T09:30:00Z'),
        status: 'confirmed',
      },
      {
        providerEventId: 'evt-6',
        summary: 'Beard trim',
        startTime: new Date('2026-07-05T10:00:00Z'),
        endTime: new Date('2026-07-05T10:30:00Z'),
        status: 'cancelled',
      },
    ])

    const result = await syncAppointments(supabase, businessId, provider, 'cal1', new Date('2026-06-01T00:00:00Z'))
    expect(result.newlyCancelled).toHaveLength(1)
    expect(result.newlyCancelled[0].appointmentId).toBeTypeOf('string')
  })
})
