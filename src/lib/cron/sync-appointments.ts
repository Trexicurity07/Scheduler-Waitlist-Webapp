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
  const newlyCancelled: NewlyCancelledAppointment[] = []

  for (const event of events) {
    const { data: existing } = await supabase
      .from('appointments')
      .select('id, status')
      .eq('business_id', businessId)
      .eq('google_event_id', event.providerEventId)
      .maybeSingle()

    const { data: upserted, error } = await supabase
      .from('appointments')
      .upsert(
        {
          business_id: businessId,
          google_event_id: event.providerEventId,
          summary: event.summary,
          start_time: event.startTime.toISOString(),
          end_time: event.endTime.toISOString(),
          status: event.status,
          synced_at: new Date().toISOString(),
        },
        { onConflict: 'business_id,google_event_id' }
      )
      .select('id')
      .single()
    if (error || !upserted) throw error

    const wasAlreadyCancelled = existing?.status === 'cancelled'
    if (event.status === 'cancelled' && !wasAlreadyCancelled) {
      newlyCancelled.push({
        appointmentId: upserted.id,
        startTime: event.startTime,
        endTime: event.endTime,
      })
    }
  }

  return { newlyCancelled }
}
