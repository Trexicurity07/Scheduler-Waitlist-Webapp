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
