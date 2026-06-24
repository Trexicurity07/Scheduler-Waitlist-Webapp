import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CalendarProvider } from '@/lib/calendar/provider'

export interface NewlyCancelledAppointment {
  appointmentId: string
  startTime: Date
  endTime: Date
}

export async function syncAppointments(
  supabase: SupabaseClient<Database>,
  businessId: string,
  provider: CalendarProvider,
  calendarId: string,
  since: Date
): Promise<{ newlyCancelled: NewlyCancelledAppointment[] }> {
  const events = await provider.listChangedEvents(calendarId, since)
  if (events.length === 0) return { newlyCancelled: [] }

  const eventIds = events.map((event) => event.providerEventId)

  const { data: existingRows, error: existingError } = await supabase
    .from('appointments')
    .select('google_event_id, status')
    .eq('business_id', businessId)
    .in('google_event_id', eventIds)
  if (existingError) throw existingError

  const priorStatusByEventId = new Map(
    (existingRows ?? []).map((row) => [row.google_event_id, row.status])
  )

  const { data: upserted, error: upsertError } = await supabase
    .from('appointments')
    .upsert(
      events.map((event) => ({
        business_id: businessId,
        google_event_id: event.providerEventId,
        summary: event.summary,
        start_time: event.startTime.toISOString(),
        end_time: event.endTime.toISOString(),
        status: event.status,
        synced_at: new Date().toISOString(),
      })),
      { onConflict: 'business_id,google_event_id' }
    )
    .select('id, google_event_id')
  if (upsertError || !upserted) throw upsertError

  const idByEventId = new Map(upserted.map((row) => [row.google_event_id, row.id]))

  const newlyCancelled: NewlyCancelledAppointment[] = []
  for (const event of events) {
    const wasAlreadyCancelled = priorStatusByEventId.get(event.providerEventId) === 'cancelled'
    const appointmentId = idByEventId.get(event.providerEventId)
    if (event.status === 'cancelled' && !wasAlreadyCancelled && appointmentId) {
      newlyCancelled.push({
        appointmentId,
        startTime: event.startTime,
        endTime: event.endTime,
      })
    }
  }

  return { newlyCancelled }
}
