import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { joinWaitlist } from '@/lib/waitlist/join-waitlist'

const requestSchema = z.object({
  businessSlug: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(7),
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

export async function POST(request: Request): Promise<NextResponse> {
  const body = await request.json()
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const result = await joinWaitlist(supabase, parsed.data)

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 })
  }
  return NextResponse.json({ ok: true })
}
