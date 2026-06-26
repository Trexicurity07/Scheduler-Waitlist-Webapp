import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { removeWaitlistEntry } from '@/lib/dashboard/manage-waitlist'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, error: 'Not authenticated' }, { status: 401 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_user_id', userData.user.id)
    .single()
  if (!business) {
    return NextResponse.json({ ok: false, error: 'Business not found' }, { status: 404 })
  }

  const result = await removeWaitlistEntry(supabase, business.id, id)
  return NextResponse.json(result, { status: result.ok ? 200 : 404 })
}
