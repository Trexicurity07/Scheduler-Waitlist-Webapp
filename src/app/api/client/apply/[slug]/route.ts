import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { applyToBusiness } from '@/lib/client-dashboard/apply-to-business'

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const timeWindows: unknown = body?.time_windows
  if (!Array.isArray(timeWindows) || timeWindows.length === 0) {
    return NextResponse.json({ error: 'Please select at least one time window.' }, { status: 400 })
  }

  const result = await applyToBusiness(supabase, user.id, slug, timeWindows)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
