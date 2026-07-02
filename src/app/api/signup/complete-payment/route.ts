import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/db/supabase'

const requestSchema = z.object({
  paymentSession: z.string().uuid(),
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
    return NextResponse.json({ ok: false, error: 'Invalid payment session.' }, { status: 400 })
  }

  const supabase = createServiceRoleClient()
  const { data: pending } = await supabase
    .from('pending_signups')
    .select('id, plan_tier')
    .eq('payment_session', parsed.data.paymentSession)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!pending) {
    return NextResponse.json(
      { ok: false, error: 'Session expired. Please sign up again.' },
      { status: 400 }
    )
  }

  // TODO: process Stripe payment here, then create owner_profiles record
  return NextResponse.json(
    { ok: false, error: 'Payment processing is not yet active. Please contact hello@slotfill.io to complete your subscription.' },
    { status: 503 }
  )
}
