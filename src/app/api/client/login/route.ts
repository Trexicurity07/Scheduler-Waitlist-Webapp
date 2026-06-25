import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/db/supabase'
import { emailSchema, phoneSchema } from '@/lib/waitlist/validate-signup'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const { identifier, password } = body ?? {}

  if (typeof identifier !== 'string' || typeof password !== 'string') {
    return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 })
  }

  let email: string
  const isEmail = emailSchema.safeParse(identifier).success
  const isPhone = phoneSchema.safeParse(identifier).success

  if (isEmail) {
    email = identifier
  } else if (isPhone) {
    const serviceSupabase = createServiceRoleClient()
    const { data: profile } = await serviceSupabase
      .from('client_profiles')
      .select('email')
      .eq('phone', identifier)
      .maybeSingle()
    if (!profile) return NextResponse.json({ error: 'No account found.' }, { status: 400 })
    email = profile.email
  } else {
    return NextResponse.json({ error: 'Enter a valid email or phone number.' }, { status: 400 })
  }

  const serviceSupabase = createServiceRoleClient()
  const { data: profile } = await serviceSupabase
    .from('client_profiles')
    .select('verified_at')
    .eq('email', email)
    .maybeSingle()
  if (!profile) return NextResponse.json({ error: 'No account found.' }, { status: 400 })
  if (!profile.verified_at) {
    return NextResponse.json({ error: 'Please verify your email before logging in.' }, { status: 400 })
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.json({ error: 'Incorrect email/phone or password.' }, { status: 400 })

  return NextResponse.json({ ok: true })
}
