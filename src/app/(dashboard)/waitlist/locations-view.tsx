'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { LocationTreeNode, WaitlistSummary } from '@/lib/dashboard/location-tree'
import { LocationSetupModal } from '@/components/location-setup-modal'
import { WaitlistSetupModal } from '@/components/waitlist-setup-modal'

interface Props {
  tree: LocationTreeNode[]
  calendarConnected?: boolean
  nodeId?: string
}

function statusDotClass(status: WaitlistSummary['calendar_status']) {
  if (status === 'connected') return 'text-green-400'
  if (status === 'disconnected') return 'text-red-400'
  return 'text-slate-500'
}

function WaitlistRow({
  waitlist,
  depth,
  onSettings,
}: {
  waitlist: WaitlistSummary
  depth: number
  onSettings: (wl: WaitlistSummary) => void
}) {
  const router = useRouter()
  const statusLabel =
    waitlist.calendar_status === 'connected'
      ? 'connected'
      : waitlist.calendar_status === 'disconnected'
        ? 'disconnected'
        : 'pending'

  return (
    <div
      onClick={() => router.push('/waitlist/' + waitlist.id)}
      className={cn(
        'flex items-center gap-2.5 pr-3 py-2 rounded cursor-pointer transition-colors hover:bg-white/[0.03]',
        depth > 0 && 'border-l-2 border-slate-700 ml-3'
      )}
      style={{ paddingLeft: `${depth * 16 + 12}px` }}
    >
      <span className="text-xs shrink-0">📋</span>
      <span className={`text-[10px] shrink-0 ${statusDotClass(waitlist.calendar_status)}`}>●</span>
      <span className="flex-1 text-sm text-white truncate" title={waitlist.name}>
        {waitlist.name}
      </span>
      <span className="text-xs text-slate-500 shrink-0">{statusLabel}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onSettings(waitlist) }}
        title="Settings"
        className="text-slate-500 hover:text-slate-300 text-sm cursor-pointer bg-transparent border-none p-0.5 shrink-0"
      >
        ⚙
      </button>
    </div>
  )
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onAddWaitlist,
  onAddFolder,
  onSettings,
}: {
  node: LocationTreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onAddWaitlist: (nodeId: string) => void
  onAddFolder: (nodeId: string) => void
  onSettings: (wl: WaitlistSummary) => void
}) {
  const isExpanded = expanded.has(node.id)
  const typeIcon = node.type === 'location' ? '📍' : '📁'
  const hasChildren = node.children.length > 0 || node.waitlists.length > 0

  return (
    <div className={cn(depth > 0 && 'ml-4')}>
      <div
        onClick={() => onToggle(node.id)}
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 cursor-pointer select-none rounded-md hover:bg-white/[0.03] transition-colors',
          depth > 0 && 'border-l-2 border-slate-700'
        )}
      >
        <span className="text-sm shrink-0">{typeIcon}</span>
        <span className="flex-1 text-[15px] font-semibold text-white truncate" title={node.name}>
          {node.name}
          {node.type === 'location' && node.address && (
            <span className="font-normal text-slate-500 ml-2 text-xs">— {node.address}</span>
          )}
        </span>
        {hasChildren && (
          <span className="text-slate-500 text-xs shrink-0">{isExpanded ? '▼' : '▶'}</span>
        )}
      </div>

      {isExpanded && (
        <div className="mt-1 mb-1">
          <div
            className="flex gap-2 pb-2 flex-wrap"
            style={{ paddingLeft: depth > 0 ? '28px' : '12px' }}
          >
            <button
              onClick={() => onAddWaitlist(node.id)}
              className="px-2.5 py-1 text-xs rounded border border-blue-500/25 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
            >
              + Create Waitlist
            </button>
            <button
              onClick={() => onAddFolder(node.id)}
              className="px-2.5 py-1 text-xs rounded border border-white/[0.12] bg-white/[0.04] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              + Create Folder
            </button>
          </div>

          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expanded={expanded}
              onToggle={onToggle}
              onAddWaitlist={onAddWaitlist}
              onAddFolder={onAddFolder}
              onSettings={onSettings}
            />
          ))}

          {node.waitlists.map((wl) => (
            <WaitlistRow key={wl.id} waitlist={wl} depth={depth + 1} onSettings={onSettings} />
          ))}

          {node.children.length === 0 && node.waitlists.length === 0 && (
            <p
              className="text-xs text-slate-500 mb-2"
              style={{ paddingLeft: depth > 0 ? '28px' : '12px' }}
            >
              No folders or waitlists yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function LocationCard({
  node,
  defaultExpanded,
  onAddWaitlist,
  onAddFolder,
  onSettings,
}: {
  node: LocationTreeNode
  defaultExpanded: boolean
  onAddWaitlist: (nodeId: string) => void
  onAddFolder: (nodeId: string) => void
  onSettings: (wl: WaitlistSummary) => void
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const s = new Set<string>()
    if (defaultExpanded) s.add(node.id)
    return s
  })

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const isExpanded = expanded.has(node.id)

  return (
    <div className="bg-[#1e293b] border border-slate-700 rounded-xl overflow-hidden mb-4">
      <div
        onClick={() => toggle(node.id)}
        className={cn(
          'flex items-center gap-2.5 px-4 py-3.5 cursor-pointer select-none hover:bg-white/[0.02] transition-colors',
          isExpanded && 'border-b border-slate-700'
        )}
      >
        <span className="text-base shrink-0">📍</span>
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-bold text-white truncate">{node.name}</div>
          {node.address && (
            <div className="text-xs text-slate-500 truncate">{node.address}</div>
          )}
        </div>
        <span className="text-slate-500 text-xs shrink-0">{isExpanded ? '▼' : '▶'}</span>
      </div>

      {isExpanded && (
        <div className="p-3">
          <div className="flex gap-2 mb-3 flex-wrap">
            <button
              onClick={() => onAddWaitlist(node.id)}
              className="px-2.5 py-1 text-xs rounded border border-blue-500/25 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors cursor-pointer"
            >
              + Create Waitlist
            </button>
            <button
              onClick={() => onAddFolder(node.id)}
              className="px-2.5 py-1 text-xs rounded border border-white/[0.12] bg-white/[0.04] text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              + Create Folder
            </button>
          </div>

          {node.children.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              depth={0}
              expanded={expanded}
              onToggle={toggle}
              onAddWaitlist={onAddWaitlist}
              onAddFolder={onAddFolder}
              onSettings={onSettings}
            />
          ))}

          {node.waitlists.map((wl) => (
            <WaitlistRow key={wl.id} waitlist={wl} depth={0} onSettings={onSettings} />
          ))}

          {node.children.length === 0 && node.waitlists.length === 0 && (
            <p className="text-xs text-slate-500 m-0">
              No folders or waitlists yet. Use the buttons above to add some.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

type ModalState =
  | { kind: 'none' }
  | { kind: 'location'; parentId: string | null; type: 'location' | 'folder' }
  | { kind: 'waitlist-create'; nodeId: string }
  | { kind: 'waitlist-edit'; waitlist: WaitlistSummary & { nodeId: string } }

export function LocationsView({ tree, calendarConnected, nodeId }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })

  useEffect(() => {
    if (calendarConnected && nodeId) {
      setModal({ kind: 'waitlist-create', nodeId })
    }
  }, [calendarConnected, nodeId])

  function handleSuccess() {
    setModal({ kind: 'none' })
    router.refresh()
  }

  const defaultExpanded = tree.length === 1

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-white m-0">Locations &amp; Waitlists</h1>
        <Button onClick={() => setModal({ kind: 'location', parentId: null, type: 'location' })}>
          + Add Location
        </Button>
      </div>

      {tree.length === 0 ? (
        <div className="bg-[#1e293b] border border-slate-700 rounded-xl p-12 text-center">
          <p className="text-slate-500 text-sm mb-5">
            No locations yet. Add your first location to get started.
          </p>
          <Button onClick={() => setModal({ kind: 'location', parentId: null, type: 'location' })}>
            + Add Location
          </Button>
        </div>
      ) : (
        <div>
          {tree.map((node) => (
            <LocationCard
              key={node.id}
              node={node}
              defaultExpanded={defaultExpanded}
              onAddWaitlist={(nId) => setModal({ kind: 'waitlist-create', nodeId: nId })}
              onAddFolder={(nId) => setModal({ kind: 'location', parentId: nId, type: 'folder' })}
              onSettings={(wl) => setModal({ kind: 'waitlist-edit', waitlist: { ...wl, nodeId: '' } })}
            />
          ))}
        </div>
      )}

      {modal.kind === 'location' && (
        <LocationSetupModal
          parentId={modal.parentId}
          type={modal.type}
          onClose={() => setModal({ kind: 'none' })}
          onSuccess={handleSuccess}
        />
      )}

      {modal.kind === 'waitlist-create' && (
        <WaitlistSetupModal
          nodeId={modal.nodeId}
          mode="create"
          onClose={() => setModal({ kind: 'none' })}
          onSuccess={handleSuccess}
        />
      )}

      {modal.kind === 'waitlist-edit' && (
        <WaitlistSetupModal
          nodeId={modal.waitlist.nodeId}
          mode="edit"
          waitlist={{
            id: modal.waitlist.id,
            name: modal.waitlist.name,
            description: modal.waitlist.description,
            calendar_status: modal.waitlist.calendar_status,
            dedicated_calendar_id: modal.waitlist.dedicated_calendar_id,
            batch_size: modal.waitlist.batch_size,
            batch_interval_minutes: modal.waitlist.batch_interval_minutes,
            min_notice_hours: modal.waitlist.min_notice_hours,
            min_confirm_lead_hours: modal.waitlist.min_confirm_lead_hours,
            timezone: modal.waitlist.timezone,
          }}
          onClose={() => setModal({ kind: 'none' })}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
