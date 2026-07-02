import bcrypt from 'bcryptjs'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { passwordSchema } from '@/lib/auth/validate-password'
import { sendSignupCodeEmail } from '@/lib/notifications/email'

const requestSchema = z.object({
  email: z.string().trim().email().max(254, 'Email address is too long'),
  password: passwordSchema,
  businessName: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(80, 'Business name must be at most 80 characters'),
  plan: z.enum(['starter', 'pro', 'max']).default('starter'),
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
    const message = parsed.error.issues[0]?.message ?? 'Invalid input'
    return NextResponse.json({ ok: false, error: message }, { status: 400 })
  }

  const { email, password, businessName, plan } = parsed.data
  const normalizedEmail = email.toLowerCase()
  const serviceSupabase = createServiceRoleClient()

  const { data: existingName } = await serviceSupabase
    .from('owner_profiles')
    .select('auth_user_id')
    .ilike('business_name', businessName)
    .maybeSingle()
  if (existingName) {
    return NextResponse.json({ ok: false, error: 'Name taken' }, { status: 409 })
  }

  const { data: existingEmail } = await serviceSupabase
    .from('owner_profiles')
    .select('auth_user_id')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (existingEmail) {
    return NextResponse.json({ ok: false, error: 'An account with this email already exists.' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const { error: upsertError } = await serviceSupabase
    .from('pending_signups')
    .upsert(
      {
        account_type: 'owner',
        email: normalizedEmail,
        password_hash: passwordHash,
        verification_code: code,
        expires_at: expiresAt,
        business_name: businessName,
        plan_tier: plan,
      },
      { onConflict: 'email,account_type' }
    )

  if (upsertError) {
    return NextResponse.json({ ok: false, error: 'Could not create account. Please try again.' }, { status: 500 })
  }

  await sendSignupCodeEmail(normalizedEmail, { code })

  return NextResponse.json({ ok: true })
}
