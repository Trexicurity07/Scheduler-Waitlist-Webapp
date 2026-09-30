import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { emailSchema, phoneSchema } from '@/lib/waitlist/validate-signup'

const SESSION_DAYS = 30

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const { identifier, password } = body ?? {}

  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 })
  }

  const serviceSupabase = createServiceRoleClient()
  let email: string
  const isEmail = emailSchema.safeParse(identifier).success
  const isPhone = phoneSchema.safeParse(identifier).success

  if (isEmail) {
    email = identifier.toLowerCase()
  } else if (isPhone) {
    const normalizedPhone = identifier.replace(/^\+/, '')
    const { data: byPhone } = await serviceSupabase
      .from('client_profiles')
      .select('email')
      .eq('phone', normalizedPhone)
      .maybeSingle()
    if (!byPhone) return NextResponse.json({ error: 'No account found.' }, { status: 400 })
    email = byPhone.email
  } else {
    const { data: byName } = await serviceSupabase
      .from('client_profiles')
      .select('email')
      .ilike('name', identifier)
    if (!byName || byName.length === 0) {
      return NextResponse.json({ error: 'No account found.' }, { status: 400 })
    }
    if (byName.length > 1) {
      return NextResponse.json(
        { error: 'Multiple accounts found with that name. Please use email or phone.' },
        { status: 400 }
      )
    }
    email = byName[0].email
  }

  const { data: profile } = await serviceSupabase
    .from('client_profiles')
    .select('user_id, password_hash')
    .eq('email', email)
    .maybeSingle()

  if (!profile || !profile.password_hash) {
    return NextResponse.json({ error: 'No account found.' }, { status: 400 })
  }

  const match = await bcrypt.compare(password, profile.password_hash)
  if (!match) {
    return NextResponse.json({ error: 'Incorrect email/phone or password.' }, { status: 400 })
  }

  const sessionToken = randomUUID()
  const sessionExpiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await serviceSupabase
    .from('client_profiles')
    .update({ session_token: sessionToken, session_expires_at: sessionExpiresAt })
    .eq('user_id', profile.user_id)

  const response = NextResponse.json({ ok: true })
  response.cookies.set('sf_client_session', sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
  return response
}
