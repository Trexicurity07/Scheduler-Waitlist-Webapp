import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/db/supabase'
import { passwordSchema } from '@/lib/auth/validate-password'

const requestSchema = z.object({
  email: z.string().trim().email().max(254, 'Email address is too long'),
  password: passwordSchema,
  businessName: z
    .string()
    .trim()
    .min(1, 'Business name is required')
    .max(80, 'Business name must be at most 80 characters'),
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

  const { email, password, businessName } = parsed.data

  const serviceSupabase = createServiceRoleClient()
  const { data: existing } = await serviceSupabase
    .from('owner_profiles')
    .select('auth_user_id')
    .ilike('business_name', businessName)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Name taken' }, { status: 409 })
  }

  const supabase = await createServerSupabaseClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${appUrl}/auth/confirm` },
  })
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }

  const userId = signUpData.user?.id
  if (userId) {
    await serviceSupabase.from('owner_profiles').insert({
      auth_user_id: userId,
      business_name: businessName,
      email,
    })
  }

  return NextResponse.json({ ok: true })
}
