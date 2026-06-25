import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { verifyClientEmail } from '@/lib/client-auth/verify-client-email'

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const token: unknown = body?.token
  if (typeof token !== 'string') return NextResponse.json({ error: 'Missing token.' }, { status: 400 })

  const supabase = createServiceRoleClient()
  const result = await verifyClientEmail(supabase, token)

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
