import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest'
import { createServiceRoleClient } from '@/lib/db/supabase'
import type { CalendarProvider } from '@/lib/calendar/provider'
import { completeSetup } from './complete-setup'

function fakeProvider(overrides: Partial<CalendarProvider> = {}): CalendarProvider {
  return {
    listCalendars: async () => [],
    createCalendar: async (summary) => ({ id: 'new-cal-id', summary, timezone: 'UTC' }),
    getCalendarTimezone: async () => 'America/New_York',
    listChangedEvents: async () => [],
    createEvent: async () => {
      throw new Error('not used in this test')
    },
    ...overrides,
  }
}

describe('completeSetup (integration)', () => {
  let userId: string
  let secondUserId: string | null = null
  let createdBusinessIds: string[] = []

  beforeAll(async () => {
    const supabase = createServiceRoleClient()
    const { data, error } = await supabase.auth.admin.createUser({
      email: `complete-setup-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    if (error || !data.user) throw error
    userId = data.user.id
  })

  afterEach(async () => {
    const supabase = createServiceRoleClient()
    for (const id of createdBusinessIds) {
      await supabase.from('businesses').delete().eq('id', id)
    }
    createdBusinessIds = []
  })

  afterAll(async () => {
    const supabase = createServiceRoleClient()
    await supabase.auth.admin.deleteUser(userId)
    if (secondUserId) await supabase.auth.admin.deleteUser(secondUserId)
  })

  it('creates a business using an existing chosen calendar', async () => {
    const supabase = createServiceRoleClient()
    const result = await completeSetup(supabase, fakeProvider(), {
      userId,
      refreshToken: 'fake-refresh-token',
      calendars: [{ id: 'cal1', summary: 'Bookings', timezone: 'America/New_York' }],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: false,
      calendarId: 'cal1',
    })
    expect(result.ok).toBe(true)

    const { data } = await supabase.from('businesses').select('*').eq('owner_user_id', userId).single()
    expect(data?.public_slug).toBe('jane-doe-salon')
    expect(data?.dedicated_calendar_id).toBe('cal1')
    expect(data?.timezone).toBe('America/New_York')
    createdBusinessIds.push(data!.id)
  })

  it('creates a new calendar when createNewCalendar is true', async () => {
    const supabase = createServiceRoleClient()
    const result = await completeSetup(supabase, fakeProvider(), {
      userId,
      refreshToken: 'fake-refresh-token',
      calendars: [],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: true,
      newCalendarName: 'Client Bookings',
    })
    expect(result.ok).toBe(true)

    const { data } = await supabase.from('businesses').select('*').eq('owner_user_id', userId).single()
    expect(data?.dedicated_calendar_id).toBe('new-cal-id')
    createdBusinessIds.push(data!.id)
  })

  it('appends a numeric suffix when the slug is already taken', async () => {
    const supabase = createServiceRoleClient()
    await completeSetup(supabase, fakeProvider(), {
      userId,
      refreshToken: 'fake-refresh-token',
      calendars: [{ id: 'cal1', summary: 'Bookings', timezone: 'America/New_York' }],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: false,
      calendarId: 'cal1',
    })
    const { data: first } = await supabase.from('businesses').select('id').eq('owner_user_id', userId).single()
    createdBusinessIds.push(first!.id)

    const { data: secondUser } = await supabase.auth.admin.createUser({
      email: `complete-setup-2-${Date.now()}@example.com`,
      password: 'test-password-123',
      email_confirm: true,
    })
    secondUserId = secondUser!.user!.id

    const result = await completeSetup(supabase, fakeProvider(), {
      userId: secondUserId,
      refreshToken: 'fake-refresh-token',
      calendars: [{ id: 'cal2', summary: 'Bookings', timezone: 'America/New_York' }],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: false,
      calendarId: 'cal2',
    })
    expect(result.ok).toBe(true)

    const { data: second } = await supabase
      .from('businesses')
      .select('id, public_slug')
      .eq('owner_user_id', secondUserId)
      .single()
    expect(second?.public_slug).toBe('jane-doe-salon-2')
    createdBusinessIds.push(second!.id)
  })

  it('returns an error when the chosen calendarId is not in the calendars list', async () => {
    const supabase = createServiceRoleClient()
    const result = await completeSetup(supabase, fakeProvider(), {
      userId,
      refreshToken: 'fake-refresh-token',
      calendars: [{ id: 'cal1', summary: 'Bookings', timezone: 'America/New_York' }],
      businessName: 'Jane Doe Salon',
      whatsappNumber: '+15551234567',
      createNewCalendar: false,
      calendarId: 'does-not-exist',
    })
    expect(result.ok).toBe(false)
  })
})
