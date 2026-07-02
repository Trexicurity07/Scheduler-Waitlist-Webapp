import bcrypt from 'bcryptjs'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { sendSignupCodeEmail } from '@/lib/notifications/email'
import { nameSchema, emailSchema, phoneSchema } from '@/lib/waitlist/validate-signup'
import { passwordSchema } from '@/lib/auth/validate-password'
import { z } from 'zod'

const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
})

export type SignupInput = z.infer<typeof signupSchema>

export async function signupClient(
  supabase: SupabaseClient<Database>,
  rawInput: SignupInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = signupSchema.safeParse(rawInput)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }
  const input = parsed.data
  const normalizedEmail = input.email.toLowerCase()

  const { data: existingByEmail } = await supabase
    .from('client_profiles')
    .select('user_id')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (existingByEmail) return { ok: false, error: 'An account with this email already exists.' }

  const { data: existingByPhone } = await supabase
    .from('client_profiles')
    .select('user_id')
    .eq('phone', input.phone)
    .maybeSingle()
  if (existingByPhone) return { ok: false, error: 'An account with this phone number already exists.' }

  const passwordHash = await bcrypt.hash(input.password, 12)
  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  const { error: upsertError } = await supabase
    .from('pending_signups')
    .upsert(
      {
        account_type: 'client',
        email: normalizedEmail,
        password_hash: passwordHash,
        verification_code: code,
        expires_at: expiresAt,
        name: input.name,
        phone: input.phone,
      },
      { onConflict: 'email,account_type' }
    )

  if (upsertError) {
    return { ok: false, error: 'Could not create account. Please try again.' }
  }

  await sendSignupCodeEmail(normalizedEmail, { code })

  return { ok: true }
}
