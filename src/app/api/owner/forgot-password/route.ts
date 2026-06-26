import { randomInt, randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { maskEmail } from '@/lib/auth/mask-email'
import { sendPasswordResetEmail } from '@/lib/notifications/email'

const EXPIRY_MINUTES = 15

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const { email } = body ?? {}

  if (typeof email !== 'string' || !email.trim()) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  const normalizedEmail = email.trim().toLowerCase()
  const maskedEmail = maskEmail(email.trim())
  const sessionToken = randomUUID()

  const serviceSupabase = createServiceRoleClient()
  const { data: profile } = await serviceSupabase
    .from('owner_profiles')
    .select('auth_user_id')
    .eq('email', normalizedEmail)
    .maybeSingle()

  if (profile) {
    const code = String(randomInt(10000000, 100000000))
    const expiresAt = new Date(Date.now() + EXPIRY_MINUTES * 60 * 1000).toISOString()

    await serviceSupabase
      .from('owner_profiles')
      .update({
        password_reset_token: code,
        password_reset_expires_at: expiresAt,
        password_reset_session: sessionToken,
        password_reset_attempts: 0,
      })
      .eq('auth_user_id', profile.auth_user_id)

    await sendPasswordResetEmail(normalizedEmail, { code, expiryMinutes: EXPIRY_MINUTES })
  }

  // Always return the same shape — never reveal whether account exists
  return NextResponse.json({ maskedEmail, sessionToken })
}
