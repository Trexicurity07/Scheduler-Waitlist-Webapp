import { notFound } from 'next/navigation'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { WaitlistDetailView } from './waitlist-detail-view'

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function WaitlistDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const { supabase, business } = await getCurrentBusiness()
  if (!business) notFound()

  // Fetch waitlist — must belong to this business
  const { data: waitlist } = await supabase
    .from('waitlists')
    .select('*')
    .eq('id', id)
    .eq('business_id', business.id)
    .maybeSingle()

  if (!waitlist) notFound()

  // Fetch active entries
  const { data: entries } = await supabase
    .from('waitlist_entries')
    .select('id, status, client_id')
    .eq('waitlist_id', id)
    .eq('status', 'active')

  // Fetch client profiles for entry names/emails
  const clientIds = (entries ?? []).map((e) => e.client_id).filter(Boolean) as string[]
  const { data: clientProfiles } =
    clientIds.length > 0
      ? await supabase
          .from('client_profiles')
          .select('user_id, name, email')
          .in('user_id', clientIds)
      : { data: [] }

  const profileMap = new Map((clientProfiles ?? []).map((p) => [p.user_id, p]))
  const enrichedEntries = (entries ?? []).map((e) => ({
    id: e.id,
    clientId: e.client_id,
    name: profileMap.get(e.client_id ?? '')?.name ?? 'Unknown',
    email: profileMap.get(e.client_id ?? '')?.email ?? '',
  }))

  const sp = await searchParams
  const defaultSettingsOpen = sp['settings'] === '1'

  // Build breadcrumb by walking the location_nodes parent chain
  const { data: allNodes } = await supabase
    .from('location_nodes')
    .select('id, parent_id, name, type')
    .eq('business_id', business.id)

  const nodeMap = new Map((allNodes ?? []).map((n) => [n.id, n]))
  const breadcrumb: string[] = []
  let current = nodeMap.get(waitlist.node_id)
  while (current) {
    breadcrumb.unshift(current.name)
    current = current.parent_id ? nodeMap.get(current.parent_id) : undefined
  }

  return (
    <WaitlistDetailView
      waitlist={waitlist}
      entries={enrichedEntries}
      breadcrumb={breadcrumb}
      defaultSettingsOpen={defaultSettingsOpen}
    />
  )
}
