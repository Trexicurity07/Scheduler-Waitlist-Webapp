import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { addWaitlistEntry } from '@/lib/dashboard/manage-waitlist'

const addEntrySchema = z.object({
  identifier: z.string().min(1),
  timeWindows: z
    .array(
      z.object({
        days: z.array(z.number().int().min(0).max(6)).min(1),
        start: z.string().regex(/^\d{2}:\d{2}$/),
        end: z.string().regex(/^\d{2}:\d{2}$/),
      })
    )
    .min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, business } = await getCurrentBusiness()
  if (!business) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const parsed = addEntrySchema.safeParse(await request.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0].message }, { status: 400 })
  }

  const result = await addWaitlistEntry(supabase, business.id, id, parsed.data)
  return NextResponse.json(result, { status: result.ok ? 200 : 400 })
}
