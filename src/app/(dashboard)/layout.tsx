import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { fetchLocationTree } from '@/lib/dashboard/location-tree'
import { DashboardShell } from '@/components/dashboard-shell'
import OwnerNav from './owner-nav'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { supabase, business } = await getCurrentBusiness()
  const tree = business ? await fetchLocationTree(supabase, business.id) : []

  return (
    <div className="relative flex flex-col min-h-screen bg-[#0f172a]">
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <OwnerNav />
      <DashboardShell tree={tree}>
        {children}
      </DashboardShell>
    </div>
  )
}
