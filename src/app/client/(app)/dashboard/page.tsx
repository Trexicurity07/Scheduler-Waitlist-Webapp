import { getCurrentClient } from '@/lib/client-auth/get-current-client'
import { getMyEntries, getMyOffers, getPastEntries } from '@/lib/client-dashboard/manage-own-entries'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
    <main className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">
          Welcome, {profile.name}
        </h1>
        <p className="text-slate-400 text-sm">Your waitlists and slot offers</p>
      </div>

      <Tabs defaultValue={offers.length > 0 ? 'offers' : 'active'}>
        <TabsList className="bg-white/[0.04] border border-white/[0.08] mb-6">
          <TabsTrigger value="active" className="data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            Active
            {entries.length > 0 && (
              <span className="ml-1.5 text-xs bg-blue-500/20 text-blue-400 rounded-full px-1.5 py-0.5">
                {entries.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="offers" className="data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            Pending Offers
            {offers.length > 0 && (
              <span className="ml-1.5 text-xs bg-sky-500/20 text-sky-400 rounded-full px-1.5 py-0.5">
                {offers.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="past" className="data-[state=active]:bg-[#1e293b] data-[state=active]:text-white">
            Past
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <ActiveEntriesSection entries={entries} />
        </TabsContent>

        <TabsContent value="offers">
          <PendingOffersSection offers={offers} />
        </TabsContent>

        <TabsContent value="past">
          <PastEntriesSection entries={past} />
        </TabsContent>
      </Tabs>
    </main>
  )
}
