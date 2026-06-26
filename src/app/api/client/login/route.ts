import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/db/supabase'
import { emailSchema, phoneSchema } from '@/lib/waitlist/validate-signup'

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
    email = identifier
  } else if (isPhone) {
    const normalizedPhone = identifier.replace(/^\+/, '')
    const { data: profile } = await serviceSupabase
      .from('client_profiles')
      .select('email')
      .eq('phone', normalizedPhone)
      .maybeSingle()
    if (!profile) return NextResponse.json({ error: 'No account found.' }, { status: 400 })
    email = profile.email
  } else {
    // Name fallback: case-insensitive exact match
    const { data: profiles } = await serviceSupabase
      .from('client_profiles')
      .select('email')
      .ilike('name', identifier)
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ error: 'No account found.' }, { status: 400 })
    }
    if (profiles.length > 1) {
      return NextResponse.json(
        { error: 'Multiple accounts found with that name. Please use email or phone.' },
        { status: 400 }
      )
    }
    email = profiles[0].email
  }

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
