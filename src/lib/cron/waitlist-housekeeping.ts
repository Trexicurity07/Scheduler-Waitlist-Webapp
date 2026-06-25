import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type { ClaimedBusiness } from './claim-businesses'
import { sendExpiryEmail } from '@/lib/notifications/email'
import { buildWhatsAppLink } from '@/lib/notifications/whatsapp'

export async function expireWaitlistEntries(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  const { data: expiredEntries } = await supabase
    .from('waitlist_entries')
    .select('id, client_id')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .lt('expires_at', now.toISOString())

  if (!expiredEntries || expiredEntries.length === 0) return

  const entryIds = expiredEntries.map((entry) => entry.id)
  await supabase.from('waitlist_entries').update({ status: 'expired' }).in('id', entryIds)

  const clientIds = [...new Set(expiredEntries.map((entry) => entry.client_id))]
  const { data: clients } = await supabase.from('clients').select('id, email').in('id', clientIds)
  const emailByClientId = new Map((clients ?? []).map((client) => [client.id, client.email]))

  for (const entry of expiredEntries) {
    const email = emailByClientId.get(entry.client_id)
    if (!email) continue

    await sendExpiryEmail(email, {
      businessName: business.name,
      whatsappLink: buildWhatsAppLink(
        business.whatsapp_number,
        `Hi! I'd like to rejoin the waitlist for ${business.name}.`
      ),
    })
  }
}

export async function removeUnverifiedSignups(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString()

  await supabase
    .from('waitlist_entries')
    .update({ status: 'removed' })
    .eq('business_id', business.id)
    .eq('status', 'pending_verification')
    .lt('created_at', cutoff)
}
