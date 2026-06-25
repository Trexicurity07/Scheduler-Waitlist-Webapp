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

  for (const entry of expiredEntries ?? []) {
    await supabase.from('waitlist_entries').update({ status: 'expired' }).eq('id', entry.id)

    const { data: client } = await supabase.from('clients').select('email').eq('id', entry.client_id).single()
    if (!client) continue

    await sendExpiryEmail(client.email, {
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
