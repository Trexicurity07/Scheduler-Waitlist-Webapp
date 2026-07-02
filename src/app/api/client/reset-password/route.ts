import { NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { passwordSchema } from '@/lib/auth/validate-password'
import { sendPasswordChangedEmail } from '@/lib/notifications/email'

const MAX_ATTEMPTS = 5

const requestSchema = z.object({
  sessionToken: z.string().min(1),
  code: z.string().regex(/^[0-9]{8}$/, 'Code must be 8 digits'),
  newPassword: passwordSchema,
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 }
    )
  }

  const { sessionToken, code, newPassword } = parsed.data
  const serviceSupabase = createServiceRoleClient()

  const { data: profile } = await serviceSupabase
    .from('client_profiles')
    .select('user_id, email, password_reset_token, password_reset_expires_at, password_reset_attempts')
    .eq('password_reset_session', sessionToken)
    .maybeSingle()

  if (
    !profile ||
    !profile.password_reset_token ||
    !profile.password_reset_expires_at ||
    new Date(profile.password_reset_expires_at) < new Date()
  ) {
    return NextResponse.json({ error: 'Invalid or expired code.' }, { status: 400 })
  }

  if (profile.password_reset_token !== code) {
    const newAttempts = profile.password_reset_attempts + 1
    if (newAttempts >= MAX_ATTEMPTS) {
      await serviceSupabase
        .from('client_profiles')
        .update({ password_reset_token: null, password_reset_expires_at: null, password_reset_session: null, password_reset_attempts: 0 })
        .eq('user_id', profile.user_id)
      return NextResponse.json({ error: 'Too many wrong attempts. Please request a new code.' }, { status: 400 })
    }
    await serviceSupabase
      .from('client_profiles')
      .update({ password_reset_attempts: newAttempts })
      .eq('user_id', profile.user_id)
    const remaining = MAX_ATTEMPTS - newAttempts
    return NextResponse.json(
      { error: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` },
      { status: 400 }
    )
  }

  // Correct — clear token immediately
  await serviceSupabase
    .from('client_profiles')
    .update({ password_reset_token: null, password_reset_expires_at: null, password_reset_session: null, password_reset_attempts: 0 })
    .eq('user_id', profile.user_id)

  const passwordHash = await bcrypt.hash(newPassword, 12)
  const { error: updateError } = await serviceSupabase
    .from('client_profiles')
    .update({ password_hash: passwordHash })
    .eq('user_id', profile.user_id)
  if (updateError) {
    return NextResponse.json({ error: 'Could not update password. Please try again.' }, { status: 500 })
  }

  await sendPasswordChangedEmail(profile.email)

  return NextResponse.json({ ok: true })
}
