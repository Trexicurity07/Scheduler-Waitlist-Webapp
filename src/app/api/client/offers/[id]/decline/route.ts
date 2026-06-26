import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { declineOffer } from '@/lib/confirm/confirm-offer'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { id } = await params

  // Fetch notification and verify it belongs to this client user
  const { data: notification } = await supabase
    .from('notifications')
    .select('id, token, waitlist_entries!inner(clients!inner(user_id))')
    .eq('id', id)
    .eq('type', 'slot_offer')
    .eq('waitlist_entries.clients.user_id', user.id)
    .maybeSingle()

  if (!notification || !notification.token) {
    return NextResponse.json({ error: 'Offer not found.' }, { status: 404 })
  }

  const result = await declineOffer(supabase, notification.token)
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })
  return NextResponse.json({ ok: true })
}
