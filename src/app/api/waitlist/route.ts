import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { joinWaitlist } from '@/lib/waitlist/join-waitlist'
import { nameSchema, emailSchema, phoneSchema } from '@/lib/waitlist/validate-signup'

const requestSchema = z.object({
  businessSlug: z.string().min(1),
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
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
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid input' }, { status: 400 })
  }

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
