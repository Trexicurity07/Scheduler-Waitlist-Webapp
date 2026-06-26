import { getCurrentClient } from '@/lib/client-auth/get-current-client'
import { getMyEntries, getMyOffers, getPastEntries } from '@/lib/client-dashboard/manage-own-entries'
import ActiveEntriesSection from './active-entries-section'
import PendingOffersSection from './pending-offers-section'
import PastEntriesSection from './past-entries-section'

export default async function ClientDashboardPage() {
  const { supabase, profile } = await getCurrentClient()

  const [entries, offers, past] = await Promise.all([
    getMyEntries(supabase, profile.user_id),
    getMyOffers(supabase, profile.user_id),
    getPastEntries(supabase, profile.user_id),
  ])

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Welcome, {profile.name}</h1>

      <section>
        <h2>Pending slot offers</h2>
        <PendingOffersSection offers={offers} />
      </section>

      <section>
        <h2>Your active waitlists</h2>
        <ActiveEntriesSection entries={entries} />
      </section>

      <section>
        <h2>Past waitlists</h2>
        <PastEntriesSection entries={past} />
      </section>
    </main>
  )
}
