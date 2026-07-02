import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/db/supabase'

const SESSION_DAYS = 30

const requestSchema = z.object({
  email: z.string().trim().email(),
  code: z.string().regex(/^[0-9]{6}$/, 'Code must be 6 digits'),
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
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { email, code } = parsed.data
  const normalizedEmail = email.toLowerCase()
  const supabase = createServiceRoleClient()

  const { data: pending } = await supabase
    .from('pending_signups')
    .select('*')
    .eq('email', normalizedEmail)
    .eq('account_type', 'owner')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!pending) {
    return NextResponse.json(
      { ok: false, error: 'Code expired or not found. Please sign up again.' },
      { status: 400 }
    )
  }

  if (pending.verification_code !== code) {
    return NextResponse.json({ ok: false, error: 'Incorrect code.' }, { status: 400 })
  }

  const planTier = pending.plan_tier ?? 'starter'

  if (planTier !== 'starter') {
    const paymentSession = randomUUID()
    const paymentWindowExpiry = new Date(Date.now() + 30 * 60 * 1000).toISOString()
    await supabase
      .from('pending_signups')
      .update({ payment_session: paymentSession, expires_at: paymentWindowExpiry })
      .eq('id', pending.id)
    return NextResponse.json({ ok: true, requiresPayment: true, paymentSession, plan: planTier })
  }

  const ownerId = randomUUID()
  const sessionToken = randomUUID()
  const sessionExpiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: insertError } = await supabase.from('owner_profiles').insert({
    auth_user_id: ownerId,
    business_name: pending.business_name!,
    email: normalizedEmail,
    password_hash: pending.password_hash,
    plan_tier: 'starter',
    session_token: sessionToken,
    session_expires_at: sessionExpiresAt,
  })

  if (insertError) {
    return NextResponse.json({ ok: false, error: 'Could not create account. Please try again.' }, { status: 500 })
  }

  await supabase.from('pending_signups').delete().eq('id', pending.id)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sf_owner_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
  return response
}
