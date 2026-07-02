import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { createWaitlist } from '@/lib/dashboard/manage-waitlists'
import { decrypt } from '@/lib/crypto/encrypt'

const schema = z.object({
  nodeId: z.string().uuid(),
  calendarId: z.string().min(1),
  name: z.string().min(1).max(80),
  description: z.string().max(200).optional(),
  batchSize: z.number().int().positive().optional(),
  batchIntervalMinutes: z.number().int().positive().optional(),
  minNoticeHours: z.number().int().positive().optional(),
  minConfirmLeadHours: z.number().int().nonnegative().optional(),
  timezone: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const { supabase, business } = await getCurrentBusiness()
  if (!business) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 })
  }

  const pendingCookie = request.cookies.get('pending_connect')?.value
  if (!pendingCookie) {
    return NextResponse.json({ ok: false, error: 'No pending calendar connection' }, { status: 400 })
  }

  const { refreshToken, calendars } = JSON.parse(decrypt(pendingCookie)) as {
    refreshToken: string
    calendars: { id: string; timeZone: string }[]
  }
  const chosenCalendar = calendars.find((c) => c.id === parsed.data.calendarId)
  if (!chosenCalendar) {
    return NextResponse.json({ ok: false, error: 'Calendar not found' }, { status: 400 })
  }

  const result = await createWaitlist(supabase, business.id, {
    ...parsed.data,
    refreshToken,
    calendarTimezone: chosenCalendar.timeZone,
  })

  if (!result.ok) return NextResponse.json(result, { status: 400 })

  const response = NextResponse.json(result)
  response.cookies.delete('pending_connect')
  return response
}
