import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { fetchLocationTree } from '@/lib/dashboard/location-tree'
import { DashboardShell } from '@/components/dashboard-shell'
import OwnerNav from './owner-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, business } = await getCurrentBusiness()
  const tree = business ? await fetchLocationTree(supabase, business.id) : []

  return (
    <div className="flex flex-col min-h-screen bg-[#0f172a]">
      <OwnerNav />
      <DashboardShell tree={tree}>
        {children}
      </DashboardShell>
    </div>
  )
}
