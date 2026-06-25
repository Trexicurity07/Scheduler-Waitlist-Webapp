### Task 9: CalendarProvider Interface + GoogleCalendarProvider

**Files:**
- Create: `src/lib/calendar/provider.ts`
- Create: `src/lib/calendar/google-provider.ts`
- Test: `src/lib/calendar/google-provider.test.ts` (unit — mocks `googleapis`, never calls the live Google API)

**Interfaces:**
- Produces:
  - `interface CalendarEvent { providerEventId: string; summary: string | null; startTime: Date; endTime: Date; status: 'confirmed' | 'cancelled' }`
  - `interface CalendarListEntry { id: string; summary: string; timezone: string }`
  - `interface CreateEventInput { summary: string; description: string; startTime: Date; endTime: Date }`
  - `interface CalendarProvider { listCalendars(): Promise<CalendarListEntry[]>; createCalendar(summary: string): Promise<CalendarListEntry>; getCalendarTimezone(calendarId: string): Promise<string>; listChangedEvents(calendarId: string, since: Date): Promise<CalendarEvent[]>; createEvent(calendarId: string, input: CreateEventInput): Promise<CalendarEvent> }`
  - `class GoogleCalendarProvider implements CalendarProvider { constructor(refreshToken: string) }`
  - Consumed by Task 10 (OAuth callback — `listCalendars`, `getCalendarTimezone`), Task 11 (`createCalendar` for the create-new-calendar option), Task 13 (`listChangedEvents` in cron polling), Task 14 (`createEvent` on confirm).

- [ ] **Step 1: Define the provider interface**

`src/lib/calendar/provider.ts`:

```ts
export interface CalendarEvent {
  providerEventId: string
  summary: string | null
  startTime: Date
  endTime: Date
  status: 'confirmed' | 'cancelled'
}

export interface CalendarListEntry {
  id: string
  summary: string
  timezone: string
}

export interface CreateEventInput {
  summary: string
  description: string
  startTime: Date
  endTime: Date
}

export interface CalendarProvider {
  listCalendars(): Promise<CalendarListEntry[]>
  createCalendar(summary: string): Promise<CalendarListEntry>
  getCalendarTimezone(calendarId: string): Promise<string>
  listChangedEvents(calendarId: string, since: Date): Promise<CalendarEvent[]>
  createEvent(calendarId: string, input: CreateEventInput): Promise<CalendarEvent>
}
```

- [ ] **Step 2: Write the failing tests for `GoogleCalendarProvider`**

`src/lib/calendar/google-provider.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockList = vi.fn()
const mockGet = vi.fn()
const mockCalendarsInsert = vi.fn()
const mockEventsList = vi.fn()
const mockEventsInsert = vi.fn()

vi.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: vi.fn().mockImplementation(() => ({ setCredentials: vi.fn() })),
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
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- google-provider.test.ts`
Expected: FAIL — `src/lib/calendar/google-provider.ts` does not exist.

- [ ] **Step 4: Implement `src/lib/calendar/google-provider.ts`**

```ts
import { google, type calendar_v3 } from 'googleapis'
import type { CalendarProvider, CalendarEvent, CalendarListEntry, CreateEventInput } from './provider'

function mapEventStatus(status?: string | null): 'confirmed' | 'cancelled' {
  return status === 'cancelled' ? 'cancelled' : 'confirmed'
}

function mapEvent(event: calendar_v3.Schema$Event): CalendarEvent {
  return {
    providerEventId: event.id!,
    summary: event.summary ?? null,
    startTime: new Date(event.start?.dateTime ?? event.start?.date ?? ''),
    endTime: new Date(event.end?.dateTime ?? event.end?.date ?? ''),
    status: mapEventStatus(event.status),
  }
}

export class GoogleCalendarProvider implements CalendarProvider {
  private client: calendar_v3.Calendar

  constructor(refreshToken: string) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_OAUTH_CLIENT_ID,
      process.env.GOOGLE_OAUTH_CLIENT_SECRET
    )
    auth.setCredentials({ refresh_token: refreshToken })
    this.client = google.calendar({ version: 'v3', auth })
  }

  async listCalendars(): Promise<CalendarListEntry[]> {
    const res = await this.client.calendarList.list()
    return (res.data.items ?? []).map((item) => ({
      id: item.id!,
      summary: item.summary ?? item.id!,
      timezone: item.timeZone ?? 'UTC',
    }))
  }

  async getCalendarTimezone(calendarId: string): Promise<string> {
    const res = await this.client.calendars.get({ calendarId })
    return res.data.timeZone ?? 'UTC'
  }

  async createCalendar(summary: string): Promise<CalendarListEntry> {
    const res = await this.client.calendars.insert({ requestBody: { summary } })
    return {
      id: res.data.id!,
      summary: res.data.summary ?? summary,
      timezone: res.data.timeZone ?? 'UTC',
    }
  }

  async listChangedEvents(calendarId: string, since: Date): Promise<CalendarEvent[]> {
    const res = await this.client.events.list({
      calendarId,
      updatedMin: since.toISOString(),
      showDeleted: true,
      singleEvents: true,
    })
    return (res.data.items ?? []).map(mapEvent)
  }

  async createEvent(calendarId: string, input: CreateEventInput): Promise<CalendarEvent> {
    const res = await this.client.events.insert({
      calendarId,
      requestBody: {
        summary: input.summary,
        description: input.description,
        start: { dateTime: input.startTime.toISOString() },
        end: { dateTime: input.endTime.toISOString() },
      },
    })
    return mapEvent(res.data)
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- google-provider.test.ts`
Expected: PASS (6 tests)

- [ ] **Step 6: Commit**

```bash
git add src/lib/calendar
git commit -m "feat: add CalendarProvider interface and GoogleCalendarProvider"
```

---

