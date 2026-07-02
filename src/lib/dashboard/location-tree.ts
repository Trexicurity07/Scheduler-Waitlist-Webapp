import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export interface WaitlistSummary {
  id: string
  name: string
  description: string | null
  calendar_status: 'pending' | 'connected' | 'disconnected'
  dedicated_calendar_id: string | null
  batch_size: number
  batch_interval_minutes: number
  min_notice_hours: number
  min_confirm_lead_hours: number
  timezone: string
  sort_order: number
}

export interface LocationTreeNode {
  id: string
  parent_id: string | null
  type: 'location' | 'folder'
  name: string
  address: string | null
  description: string | null
  sort_order: number
  children: LocationTreeNode[]
  waitlists: WaitlistSummary[]
}

function bySortOrderThenName(a: { sort_order: number; name: string }, b: { sort_order: number; name: string }): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order
  return a.name.localeCompare(b.name)
}

function sortTree(node: LocationTreeNode): void {
  node.waitlists.sort(bySortOrderThenName)
  node.children.sort(bySortOrderThenName)
  for (const child of node.children) sortTree(child)
}

// Pure function — no I/O, no side effects
export function buildTree(
  nodes: Array<{
    id: string
    parent_id: string | null
    type: string
    name: string
    address: string | null
    description: string | null
    sort_order: number
  }>,
  waitlists: Array<{
    id: string
    node_id: string
    name: string
    description: string | null
    calendar_status: string
    dedicated_calendar_id: string | null
    batch_size: number
    batch_interval_minutes: number
    min_notice_hours: number
    min_confirm_lead_hours: number
    timezone: string
    sort_order: number
  }>
): LocationTreeNode[] {
  const map = new Map<string, LocationTreeNode>()

  for (const node of nodes) {
    map.set(node.id, {
      id: node.id,
      parent_id: node.parent_id,
      type: node.type as LocationTreeNode['type'],
      name: node.name,
      address: node.address,
      description: node.description,
      sort_order: node.sort_order,
      children: [],
      waitlists: [],
    })
  }

  for (const waitlist of waitlists) {
    const parent = map.get(waitlist.node_id)
    if (!parent) continue
    parent.waitlists.push({
      id: waitlist.id,
      name: waitlist.name,
      description: waitlist.description,
      calendar_status: waitlist.calendar_status as WaitlistSummary['calendar_status'],
      dedicated_calendar_id: waitlist.dedicated_calendar_id,
      batch_size: waitlist.batch_size,
      batch_interval_minutes: waitlist.batch_interval_minutes,
      min_notice_hours: waitlist.min_notice_hours,
      min_confirm_lead_hours: waitlist.min_confirm_lead_hours,
      timezone: waitlist.timezone,
      sort_order: waitlist.sort_order,
    })
  }

  const roots: LocationTreeNode[] = []

  for (const node of map.values()) {
    if (node.parent_id === null) {
      roots.push(node)
      continue
    }
    const parent = map.get(node.parent_id)
    if (!parent) continue
    parent.children.push(node)
  }

  roots.sort(bySortOrderThenName)
  for (const root of roots) sortTree(root)

  return roots
}

// DB fetch — queries location_nodes + waitlists for a business
export async function fetchLocationTree(
  supabase: SupabaseClient<Database>,
  businessId: string
): Promise<LocationTreeNode[]> {
  const [{ data: nodes }, { data: waitlists }] = await Promise.all([
    supabase.from('location_nodes').select('*').eq('business_id', businessId),
    supabase
      .from('waitlists')
      .select('id, node_id, name, description, calendar_status, dedicated_calendar_id, batch_size, batch_interval_minutes, min_notice_hours, min_confirm_lead_hours, timezone, sort_order')
      .eq('business_id', businessId),
  ])
  return buildTree(nodes ?? [], waitlists ?? [])
}
