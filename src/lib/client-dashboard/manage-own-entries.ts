import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Json } from '@/types/database'

export type TimeWindow = { days: number[]; start: string; end: string }

export type ActiveEntry = {
  entry_id: string
  client_user_id: string
  business_name: string
  business_type: string
  whatsapp_number: string | null
  time_windows: TimeWindow[]
  status: string
  expires_at: string | null
}

export type PendingOffer = {
  notification_id: string
  entry_id: string
  business_name: string
  business_type: string
  slot_start: string | null
  slot_end: string | null
  offer_expires_at: string | null
}

export type PastEntry = {
  entry_id: string
  business_name: string
  status: string
  created_at: string | null
  expires_at: string | null
}

export async function getMyEntries(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ActiveEntry[]> {
  const { data } = await supabase
    .from('waitlist_entries')
    .select(
      'id, status, time_windows, expires_at, clients!inner(user_id, businesses!inner(name, business_type, whatsapp_number))'
    )
    .eq('clients.user_id', userId)
    .eq('status', 'active')

  return (data ?? []).map((row) => {
    const client = row.clients as {
      user_id: string
      businesses: { name: string; business_type: string; whatsapp_number: string }
    }
    return {
      entry_id: row.id,
      client_user_id: client.user_id,
      business_name: client.businesses.name,
      business_type: client.businesses.business_type,
      whatsapp_number: client.businesses.whatsapp_number ?? null,
      time_windows: row.time_windows as unknown as TimeWindow[],
      status: row.status ?? 'active',
      expires_at: row.expires_at,
    }
  })
}

export async function getMyOffers(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PendingOffer[]> {
  const { data } = await supabase
    .from('notifications')
    .select(
      'id, sent_at, appointments(start_time, end_time), waitlist_entries!inner(id, clients!inner(user_id, businesses!inner(name, business_type, batch_interval_minutes)))'
    )
    .eq('type', 'slot_offer')
    .eq('status', 'sent')
    .eq('waitlist_entries.clients.user_id', userId)

  return (data ?? []).map((row) => {
    const entry = row.waitlist_entries as {
      id: string
      clients: {
        user_id: string
        businesses: { name: string; business_type: string; batch_interval_minutes: number }
      }
    }
    const appt = row.appointments as { start_time: string; end_time: string } | null
    const intervalMs = (entry.clients.businesses.batch_interval_minutes ?? 30) * 60 * 1000
    const offerExpiresAt = row.sent_at
      ? new Date(new Date(row.sent_at).getTime() + intervalMs).toISOString()
      : null

    return {
      notification_id: row.id,
      entry_id: entry.id,
      business_name: entry.clients.businesses.name,
      business_type: entry.clients.businesses.business_type,
      slot_start: appt?.start_time ?? null,
      slot_end: appt?.end_time ?? null,
      offer_expires_at: offerExpiresAt,
    }
  })
}

export async function getPastEntries(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PastEntry[]> {
  const { data } = await supabase
    .from('waitlist_entries')
    .select('id, status, created_at, expires_at, clients!inner(user_id, businesses!inner(name))')
    .eq('clients.user_id', userId)
    .in('status', ['filled', 'expired', 'removed'])
    .order('created_at', { ascending: false })
    .limit(20)

  return (data ?? []).map((row) => {
    const client = row.clients as { user_id: string; businesses: { name: string } }
    return {
      entry_id: row.id,
      business_name: client.businesses.name,
      status: row.status ?? 'expired',
      created_at: row.created_at,
      expires_at: row.expires_at,
    }
  })
}

export async function editPendingEntry(
  supabase: SupabaseClient<Database>,
  entryId: string,
  userId: string,
  timeWindows: TimeWindow[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, status, clients!inner(user_id)')
    .eq('id', entryId)
    .eq('clients.user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!entry) return { ok: false, error: 'Entry not found or cannot be edited.' }

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ time_windows: timeWindows as unknown as Json })
    .eq('id', entryId)

  if (error) return { ok: false, error: 'Could not update entry.' }
  return { ok: true }
}

export async function removeOwnEntry(
  supabase: SupabaseClient<Database>,
  entryId: string,
  userId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, status, clients!inner(user_id)')
    .eq('id', entryId)
    .eq('clients.user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!entry) return { ok: false, error: 'Entry not found or already removed.' }

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ status: 'removed' })
    .eq('id', entryId)

  if (error) return { ok: false, error: 'Could not remove entry.' }
  return { ok: true }
}
