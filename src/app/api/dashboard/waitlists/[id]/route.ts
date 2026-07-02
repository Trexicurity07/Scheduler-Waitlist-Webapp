import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { updateWaitlistSettings } from '@/lib/dashboard/manage-waitlists'

const schema = z.object({
  name: z.string().min(1).max(80).optional(),
  description: z.string().max(200).optional(),
  batchSize: z.number().int().positive().optional(),
  batchIntervalMinutes: z.number().int().positive().optional(),
  minNoticeHours: z.number().int().positive().optional(),
  minConfirmLeadHours: z.number().int().nonnegative().optional(),
  timezone: z.string().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, business } = await getCurrentBusiness()
  if (!business) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 })
  }

  const result = await updateWaitlistSettings(supabase, business.id, id, parsed.data)
  if (!result.ok) {
    return NextResponse.json(result, { status: result.error === 'Waitlist not found' ? 404 : 400 })
  }
  return NextResponse.json(result)
}
