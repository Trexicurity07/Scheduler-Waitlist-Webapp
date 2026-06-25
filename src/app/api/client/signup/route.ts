import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { signupClient } from '@/lib/client-auth/signup-client'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const result = await signupClient(supabase, body)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
