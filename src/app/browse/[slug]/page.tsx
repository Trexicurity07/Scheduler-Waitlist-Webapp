import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { buildTree } from '@/lib/dashboard/location-tree'
import { BusinessProfileView } from './business-profile-view'

export default async function BrowseBusinessPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceRoleClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_type, public_slug')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!business) notFound()

  const [{ data: nodes }, { data: waitlists }, { data: activeEntries }] = await Promise.all([
    supabase
      .from('location_nodes')
      .select('id, parent_id, type, name, address, description, sort_order')
      .eq('business_id', business.id),
    supabase
      .from('waitlists')
      .select('id, node_id, name, description, calendar_status, dedicated_calendar_id, batch_size, batch_interval_minutes, min_notice_hours, min_confirm_lead_hours, timezone, sort_order')
      .eq('business_id', business.id),
    supabase
      .from('waitlist_entries')
      .select('waitlist_id')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .not('waitlist_id', 'is', null),
  ])

  const tree = buildTree(nodes ?? [], waitlists ?? [])

  const entryCounts: Record<string, number> = {}
  for (const entry of activeEntries ?? []) {
    if (entry.waitlist_id) {
      entryCounts[entry.waitlist_id] = (entryCounts[entry.waitlist_id] ?? 0) + 1
    }
  }

  return (
    <BusinessProfileView
      business={business}
      tree={tree}
      entryCounts={entryCounts}
    />
  )
}
