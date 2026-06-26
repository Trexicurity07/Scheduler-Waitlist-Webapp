import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/db/supabase'
import { confirmOffer } from '@/lib/confirm/confirm-offer'
import { decrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { id } = await params

  // Fetch notification, verify it belongs to this client user, and get the token + business
  const { data: notification } = await supabase
    .from('notifications')
    .select(
      'id, token, status, waitlist_entries!inner(id, business_id, clients!inner(user_id, businesses!inner(google_refresh_token_encrypted)))'
    )
    .eq('id', id)
    .eq('type', 'slot_offer')
    .eq('waitlist_entries.clients.user_id', user.id)
    .maybeSingle()

  if (!notification || !notification.token) {
    return NextResponse.json({ error: 'Offer not found.' }, { status: 404 })
  }

  const entry = notification.waitlist_entries as {
    id: string
    business_id: string
    clients: { user_id: string; businesses: { google_refresh_token_encrypted: string } }
  }

  let provider: GoogleCalendarProvider
  try {
    const refreshToken = decrypt(entry.clients.businesses.google_refresh_token_encrypted)
    provider = new GoogleCalendarProvider(refreshToken)
  } catch {
    return NextResponse.json({ error: 'Calendar unavailable.' }, { status: 503 })
  }

  const result = await confirmOffer(supabase, notification.token, provider)
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 })
  return NextResponse.json({ ok: true })
}
