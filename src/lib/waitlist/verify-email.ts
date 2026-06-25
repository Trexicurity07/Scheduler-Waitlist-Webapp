import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function verifyEmail(
  supabase: SupabaseClient<Database>,
  token: string
): Promise<{ ok: true; businessName: string } | { ok: false; reason: 'expired' | 'already_used' | 'invalid' }> {
  const { data: entry } = await supabase
    .from('waitlist_entries')
    .select('id, status, created_at, businesses(name)')
    .eq('email_verification_token', token)
    .maybeSingle()

  if (!entry) return { ok: false, reason: 'invalid' }
  if (entry.status !== 'pending_verification') return { ok: false, reason: 'already_used' }

  const ageHours = (Date.now() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60)
  if (ageHours > 48) {
    await supabase.from('waitlist_entries').update({ status: 'removed' }).eq('id', entry.id)
    return { ok: false, reason: 'expired' }
  }

  await supabase
    .from('waitlist_entries')
    .update({ status: 'active', verified_at: new Date().toISOString() })
    .eq('id', entry.id)

  const businessName = entry.businesses?.name ?? 'the business'
  return { ok: true, businessName }
}
