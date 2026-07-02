import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function cleanupExpiredPendingSignups(
  supabase: SupabaseClient<Database>
): Promise<void> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  await supabase
    .from('pending_signups')
    .delete()
    .lt('created_at', oneHourAgo)
}
