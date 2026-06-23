import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockList = vi.fn()
const mockGet = vi.fn()
const mockCalendarsInsert = vi.fn()
const mockEventsList = vi.fn()
const mockEventsInsert = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: {
      // NOTE: `function` (not an arrow) so the mock is constructable under `new`.
      // vitest 4 cannot `new` a mock whose implementation is an arrow function
      // ("X is not a constructor"); a function expression has [[Construct]] and works.
      // Only deviation from the brief's pinned test; all assertions are unchanged.
      OAuth2: vi.fn().mockImplementation(function () {
        return { setCredentials: vi.fn() }
      }),
    },
    calendar: vi.fn().mockImplementation(() => ({
      calendarList: { list: mockList },
      calendars: { get: mockGet, insert: mockCalendarsInsert },
      events: { list: mockEventsList, insert: mockEventsInsert },
    })),
  },
}))

import { GoogleCalendarProvider } from './google-provider'

beforeEach(() => {
  mockList.mockReset()
  mockGet.mockReset()
  mockCalendarsInsert.mockReset()
  mockEventsList.mockReset()
  mockEventsInsert.mockReset()
})

describe('GoogleCalendarProvider', () => {
  it('maps calendar list entries', async () => {
    mockList.mockResolvedValue({
      data: { items: [{ id: 'cal1', summary: 'Bookings', timeZone: 'America/New_York' }] },
    })
    const provider = new GoogleCalendarProvider('fake-refresh-token')
    const result = await provider.listCalendars()
    expect(result).toEqual([{ id: 'cal1', summary: 'Bookings', timezone: 'America/New_York' }])
  })

  it('returns a calendar timezone', async () => {
    mockGet.mockResolvedValue({ data: { timeZone: 'Europe/London' } })
    const provider = new GoogleCalendarProvider('fake-refresh-token')
    expect(await provider.getCalendarTimezone('cal1')).toBe('Europe/London')
  })

  it('creates a new calendar and returns it as a CalendarListEntry', async () => {
    mockCalendarsInsert.mockResolvedValue({
      data: { id: 'cal-new', summary: 'Client Bookings', timeZone: 'UTC' },
    })
    const provider = new GoogleCalendarProvider('fake-refresh-token')
    const result = await provider.createCalendar('Client Bookings')
    expect(mockCalendarsInsert).toHaveBeenCalledWith({ requestBody: { summary: 'Client Bookings' } })
    expect(result).toEqual({ id: 'cal-new', summary: 'Client Bookings', timezone: 'UTC' })
  })

  it('maps cancelled events from listChangedEvents', async () => {
    mockEventsList.mockResolvedValue({
      data: {
        items: [
          {
            id: 'evt1',
            summary: 'Haircut',
            status: 'cancelled',
            start: { dateTime: '2026-07-01T14:00:00Z' },
            end: { dateTime: '2026-07-01T15:00:00Z' },
          },
        ],
      },
    })
    const provider = new GoogleCalendarProvider('fake-refresh-token')
    const result = await provider.listChangedEvents('cal1', new Date('2026-06-01T00:00:00Z'))
    expect(result[0].status).toBe('cancelled')
    expect(result[0].providerEventId).toBe('evt1')
  })

  it('maps confirmed events when status is missing or tentative', async () => {
    mockEventsList.mockResolvedValue({
      data: {
        items: [
          {
            id: 'evt2',
            summary: 'Massage',
            status: 'tentative',
            start: { dateTime: '2026-07-02T14:00:00Z' },
            end: { dateTime: '2026-07-02T15:00:00Z' },
          },
        ],
      },
    })
    const provider = new GoogleCalendarProvider('fake-refresh-token')
    const result = await provider.listChangedEvents('cal1', new Date('2026-06-01T00:00:00Z'))
    expect(result[0].status).toBe('confirmed')
  })

  it('creates a plain event with no attendees field', async () => {
    mockEventsInsert.mockResolvedValue({
      data: {
        id: 'evt3',
        summary: 'Replacement booking',
        status: 'confirmed',
        start: { dateTime: '2026-07-02T09:00:00Z' },
        end: { dateTime: '2026-07-02T10:00:00Z' },
      },
    })
    const provider = new GoogleCalendarProvider('fake-refresh-token')
    const result = await provider.createEvent('cal1', {
      summary: 'Replacement booking',
      description: 'Client: Jane Doe, jane@example.com, +15551234567',
      startTime: new Date('2026-07-02T09:00:00Z'),
      endTime: new Date('2026-07-02T10:00:00Z'),
    })
    const callArgs = mockEventsInsert.mock.calls[0][0]
    expect(callArgs.calendarId).toBe('cal1')
    expect(callArgs.requestBody.attendees).toBeUndefined()
    expect(result.providerEventId).toBe('evt3')
  })
})
