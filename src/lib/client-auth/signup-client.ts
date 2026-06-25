import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { generateToken } from '@/lib/tokens/generate-token'
import { sendVerificationEmail } from '@/lib/notifications/email'
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

  const { data: existingByEmail } = await supabase
    .from('client_profiles')
    .select('user_id')
    .eq('email', input.email)
    .maybeSingle()
  if (existingByEmail) return { ok: false, error: 'An account with this email already exists.' }

  const { data: existingByPhone } = await supabase
    .from('client_profiles')
    .select('user_id')
    .eq('phone', input.phone)
    .maybeSingle()
  if (existingByPhone) return { ok: false, error: 'An account with this phone number already exists.' }

  const { data: userData, error: authError } = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: false,
  })
  if (authError || !userData.user) {
    return { ok: false, error: 'Could not create account. Please try again.' }
  }

  const token = generateToken()

  const { error: profileError } = await supabase.from('client_profiles').insert({
    user_id: userData.user.id,
    name: input.name,
    email: input.email,
    phone: input.phone,
    email_verification_token: token,
  })
  if (profileError) {
    await supabase.auth.admin.deleteUser(userData.user.id)
    return { ok: false, error: 'Could not create profile. Please try again.' }
  }

  await sendVerificationEmail(input.email, {
    businessName: 'your account',
    verifyUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/verify-email/${token}`,
    expiryHours: 48,
  })

  return { ok: true }
}
