import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { editPendingEntry, removeOwnEntry, type TimeWindow } from '@/lib/client-dashboard/manage-own-entries'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { id } = await params
  const body = await req.json().catch(() => null)
  const timeWindows: unknown = body?.time_windows
  if (!Array.isArray(timeWindows) || timeWindows.length === 0) {
    return NextResponse.json({ error: 'Please provide at least one time window.' }, { status: 400 })
  }

  const result = await editPendingEntry(supabase, id, user.id, timeWindows as TimeWindow[])
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { id } = await params
  const result = await removeOwnEntry(supabase, id, user.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })
  return NextResponse.json({ ok: true })
}
