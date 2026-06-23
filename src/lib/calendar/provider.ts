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
