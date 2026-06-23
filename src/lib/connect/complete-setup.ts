import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { CalendarProvider } from '@/lib/calendar/provider'
import { encrypt } from '@/lib/crypto/encrypt'
import { slugify } from '@/lib/slug'

export interface CompleteSetupInput {
  userId: string
  refreshToken: string
  calendars: { id: string; summary: string; timezone: string }[]
  businessName: string
  whatsappNumber: string
  createNewCalendar: boolean
  calendarId?: string
  newCalendarName?: string
}

export async function completeSetup(
  serviceRole: SupabaseClient<Database>,
  provider: CalendarProvider,
  input: CompleteSetupInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  let calendarId: string
  let timezone: string

  if (input.createNewCalendar) {
    const created = await provider.createCalendar(input.newCalendarName ?? 'Client Bookings')
    calendarId = created.id
    timezone = created.timezone
  } else {
    const chosen = input.calendars.find((c) => c.id === input.calendarId)
    if (!chosen) {
      return { ok: false, error: 'Selected calendar not found' }
    }
    calendarId = chosen.id
    timezone = await provider.getCalendarTimezone(chosen.id)
  }

  const baseSlug = slugify(input.businessName)
  let candidate = baseSlug
  let attempt = 1
  while (true) {
    const { data } = await serviceRole.from('businesses').select('id').eq('public_slug', candidate).maybeSingle()
    if (!data) break
    attempt += 1
    candidate = `${baseSlug}-${attempt}`
  }

  const { error } = await serviceRole.from('businesses').insert({
    owner_user_id: input.userId,
    name: input.businessName,
    public_slug: candidate,
    whatsapp_number: input.whatsappNumber,
    timezone,
    dedicated_calendar_id: calendarId,
    google_refresh_token_encrypted: encrypt(input.refreshToken),
  })

  if (error) {
    return { ok: false, error: 'Could not save business' }
  }

  return { ok: true }
}
