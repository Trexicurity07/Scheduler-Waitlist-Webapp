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
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.25rem' }}>
          Welcome, {profile.name}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Your waitlists and slot offers
        </p>
      </div>

      {offers.length > 0 && (
        <section style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.875rem' }}>
            Pending slot offers
          </h2>
          <PendingOffersSection offers={offers} />
        </section>
      )}

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.875rem' }}>
          Your active waitlists
        </h2>
        <ActiveEntriesSection entries={entries} />
      </section>

      {past.length > 0 && (
        <section>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: '#f8fafc', margin: '0 0 0.875rem' }}>
            Past waitlists
          </h2>
          <PastEntriesSection entries={past} />
        </section>
      )}
    </main>
  )
}
