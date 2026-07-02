import { redirect } from 'next/navigation'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { fetchLocationTree } from '@/lib/dashboard/location-tree'
import { LocationsView } from './locations-view'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function WaitlistPage({ searchParams }: PageProps) {
  const { supabase, business } = await getCurrentBusiness()

  if (!business) {
    redirect('/connect')
  }

  const sp = await searchParams
  const calendarConnected = sp['calendarConnected'] === '1' || sp['calendarConnected'] === 'true'
  const nodeId = typeof sp['nodeId'] === 'string' ? sp['nodeId'] : undefined

  const tree = await fetchLocationTree(supabase, business.id)

  return (
    <LocationsView
      tree={tree}
      businessId={business.id}
      calendarConnected={calendarConnected}
      nodeId={nodeId}
    />
  )
}
