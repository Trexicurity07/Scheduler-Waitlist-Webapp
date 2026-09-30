import { randomInt, randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { maskEmail } from '@/lib/auth/mask-email'
import { sendPasswordResetEmail } from '@/lib/notifications/email'

const EXPIRY_MINUTES = 15

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const { email } = body ?? {}

    if (typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
    }

    const trimmed = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const normalizedEmail = trimmed.toLowerCase()
    const maskedEmail = maskEmail(trimmed)
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

      // Non-fatal — token is already persisted; email failure shouldn't break the flow
      await sendPasswordResetEmail(normalizedEmail, { code, expiryMinutes: EXPIRY_MINUTES }).catch(() => {})
    }

    // Always return the same shape — never reveal whether account exists
    return NextResponse.json({ maskedEmail, sessionToken })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
