import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { decrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'
import { confirmOffer } from '@/lib/confirm/confirm-offer'

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = createServiceRoleClient()

  const { data: notification } = await supabase
    .from('notifications')
    .select('waitlist_entries(business_id)')
    .eq('token', token)
    .eq('type', 'slot_offer')
    .maybeSingle()

  const businessId = notification?.waitlist_entries?.business_id
  if (!businessId) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 404 })
  }

  const { data: business } = await supabase
    .from('businesses')
    .select('google_refresh_token_encrypted')
    .eq('id', businessId)
    .single()

  if (!business) {
    return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 404 })
  }

  const provider = new GoogleCalendarProvider(decrypt(business.google_refresh_token_encrypted))
  const result = await confirmOffer(supabase, token, provider)

  return NextResponse.json(result, { status: result.ok ? 200 : 409 })
}
