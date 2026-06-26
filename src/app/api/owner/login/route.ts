import { NextResponse } from 'next/server'
import { createServiceRoleClient, createServerSupabaseClient } from '@/lib/db/supabase'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const { identifier, password } = body ?? {}

  if (typeof identifier !== 'string' || typeof password !== 'string' || !identifier.trim()) {
    return NextResponse.json({ error: 'Missing credentials.' }, { status: 400 })
  }

  const trimmed = identifier.trim()
  let email: string

  if (trimmed.includes('@')) {
    email = trimmed.toLowerCase()
  } else {
    const serviceSupabase = createServiceRoleClient()
    const { data: profile } = await serviceSupabase
      .from('owner_profiles')
      .select('email')
      .ilike('business_name', trimmed)
      .maybeSingle()
    if (!profile) {
      return NextResponse.json({ error: 'No account found.' }, { status: 400 })
    }
    email = profile.email
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return NextResponse.json({ error: 'Incorrect email/name or password.' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
