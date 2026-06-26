import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { decrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/db/supabase'
import { completeSetup } from '@/lib/connect/complete-setup'

const completeSchema = z.object({
  businessName: z.string().min(1),
  businessType: z.string().min(1),
  whatsappNumber: z.string().min(1),
  createNewCalendar: z.boolean(),
  calendarId: z.string().optional(),
  newCalendarName: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const parsed = completeSchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const cookieStore = await cookies()
  const pending = cookieStore.get('pending_connect')
  if (!pending) {
    return NextResponse.json({ error: 'Connection expired, please reconnect Google Calendar' }, { status: 400 })
  }
  const { refreshToken, calendars } = JSON.parse(decrypt(pending.value)) as {
    refreshToken: string
    calendars: { id: string; summary: string; timezone: string }[]
  }

  const serverClient = await createServerSupabaseClient()
  const { data: userData, error: userError } = await serverClient.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const provider = new GoogleCalendarProvider(refreshToken)
  const result = await completeSetup(createServiceRoleClient(), provider, {
    userId: userData.user.id,
    refreshToken,
    calendars,
    ...parsed.data,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.delete('pending_connect')
  return response
}
