import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { linkWaitlistCalendar, unlinkWaitlistCalendar } from '@/lib/dashboard/manage-waitlists'
import { decrypt } from '@/lib/crypto/encrypt'

const linkSchema = z.object({
  calendarId: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, business } = await getCurrentBusiness()
  if (!business) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = linkSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 })
  }

  const pendingCookie = request.cookies.get('pending_connect')?.value
  if (!pendingCookie) {
    return NextResponse.json({ ok: false, error: 'No pending calendar connection' }, { status: 400 })
  }

  const { refreshToken, calendars } = JSON.parse(decrypt(pendingCookie)) as {
    refreshToken: string
    calendars: { id: string; timezone: string }[]
  }
  const chosenCalendar = calendars.find((c) => c.id === parsed.data.calendarId)
  if (!chosenCalendar) {
    return NextResponse.json({ ok: false, error: 'Calendar not found' }, { status: 400 })
  }

  const result = await linkWaitlistCalendar(supabase, business.id, id, {
    refreshToken,
    calendarId: parsed.data.calendarId,
    calendarTimezone: chosenCalendar.timezone,
  })

  if (!result.ok) return NextResponse.json(result, { status: 400 })

  const response = NextResponse.json(result)
  response.cookies.delete('pending_connect')
  return response
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, business } = await getCurrentBusiness()
  if (!business) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const result = await unlinkWaitlistCalendar(supabase, business.id, id)
  if (!result.ok) return NextResponse.json(result, { status: 400 })
  return NextResponse.json(result)
}
