import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const STALE_THRESHOLD_MINUTES = 4

export interface ClaimedBusiness {
  id: string
  owner_user_id: string
  name: string
  public_slug: string
  whatsapp_number: string
  timezone: string
  dedicated_calendar_id: string
  google_refresh_token_encrypted: string
  last_checked_at: string | null
  batch_size: number
  batch_interval_minutes: number
  min_notice_hours: number
  min_confirm_lead_hours: number
}

export async function claimBusinesses(
  supabase: SupabaseClient<Database>,
  now: Date
): Promise<ClaimedBusiness[]> {
  const staleThreshold = new Date(now.getTime() - STALE_THRESHOLD_MINUTES * 60 * 1000).toISOString()
  const lockFilter = `processing_started_at.is.null,processing_started_at.lt.${staleThreshold}`

  const { data: candidates } = await supabase
    .from('businesses')
    .select('id')
    .eq('calendar_status', 'connected')
    .or(lockFilter)

  if (!candidates || candidates.length === 0) return []

  const claimed: ClaimedBusiness[] = []
  for (const candidate of candidates) {
    const { data } = await supabase
      .from('businesses')
      .update({ processing_started_at: now.toISOString() })
      .eq('id', candidate.id)
      .or(lockFilter)
      .select(
        'id, owner_user_id, name, public_slug, whatsapp_number, timezone, dedicated_calendar_id, google_refresh_token_encrypted, last_checked_at, batch_size, batch_interval_minutes, min_notice_hours, min_confirm_lead_hours'
      )
      .maybeSingle()

    if (data) claimed.push(data)
  }

  return claimed
}

export async function releaseBusiness(
  supabase: SupabaseClient<Database>,
  businessId: string,
  checkedAt: Date
): Promise<void> {
  await supabase
    .from('businesses')
    .update({ processing_started_at: null, last_checked_at: checkedAt.toISOString() })
    .eq('id', businessId)
}
