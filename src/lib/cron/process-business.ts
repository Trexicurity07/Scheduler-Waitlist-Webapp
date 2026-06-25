import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { decrypt } from '@/lib/crypto/encrypt'
import { GoogleCalendarProvider } from '@/lib/calendar/google-provider'
import { sendCalendarDisconnectedEmail } from '@/lib/notifications/email'
import { releaseBusiness, type ClaimedBusiness } from './claim-businesses'
import { syncAppointments } from './sync-appointments'
import { resolveStaleOffers, expireTimedOutOffers, dispatchPendingOffers } from './dispatch-offers'
import { expireWaitlistEntries, removeUnverifiedSignups } from './waitlist-housekeeping'

function isAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes('invalid_grant') || message.includes('401')
}

export async function processBusiness(
  supabase: SupabaseClient<Database>,
  business: ClaimedBusiness,
  now: Date
): Promise<void> {
  try {
    const refreshToken = decrypt(business.google_refresh_token_encrypted)
    const provider = new GoogleCalendarProvider(refreshToken)
    const since = business.last_checked_at ? new Date(business.last_checked_at) : new Date(0)

    await syncAppointments(supabase, business.id, provider, business.dedicated_calendar_id, since)
    await resolveStaleOffers(supabase, business)
    await expireTimedOutOffers(supabase, business, now)
    await dispatchPendingOffers(supabase, business, now)
    await expireWaitlistEntries(supabase, business, now)
    await removeUnverifiedSignups(supabase, business, now)
  } catch (error) {
    if (isAuthError(error)) {
      await supabase.from('businesses').update({ calendar_status: 'disconnected' }).eq('id', business.id)

      const { data: ownerUser } = await supabase.auth.admin.getUserById(business.owner_user_id)
      if (ownerUser?.user?.email) {
        await sendCalendarDisconnectedEmail(ownerUser.user.email, {
          businessName: business.name,
          reconnectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/login`,
        })
      }
    }
  } finally {
    await releaseBusiness(supabase, business.id, now)
  }
}
