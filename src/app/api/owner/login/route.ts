import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'

const SESSION_DAYS = 30

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const { identifier, password } = body ?? {}

  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim()) {
    return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 })
  }

  const trimmed = identifier.trim()
  const serviceSupabase = createServiceRoleClient()

  const query = trimmed.includes('@')
    ? serviceSupabase.from('owner_profiles').select('auth_user_id, email, password_hash').eq('email', trimmed.toLowerCase()).maybeSingle()
    : serviceSupabase.from('owner_profiles').select('auth_user_id, email, password_hash').ilike('business_name', trimmed).maybeSingle()

  const { data: profile } = await query
  if (!profile || !profile.password_hash) {
    return NextResponse.json({ error: 'Incorrect email/name or password.' }, { status: 400 })
  }

  const match = await bcrypt.compare(password, profile.password_hash)
  if (!match) {
    return NextResponse.json({ error: 'Incorrect email/name or password.' }, { status: 400 })
  }

  const sessionToken = randomUUID()
  const sessionExpiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString()

  await serviceSupabase
    .from('owner_profiles')
    .update({ session_token: sessionToken, session_expires_at: sessionExpiresAt })
    .eq('auth_user_id', profile.auth_user_id)

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
