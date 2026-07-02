'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { LocationTreeNode, WaitlistSummary } from '@/lib/dashboard/location-tree'
import { LocationSetupModal } from '@/components/location-setup-modal'
import { WaitlistSetupModal } from '@/components/waitlist-setup-modal'

interface Props {
  tree: LocationTreeNode[]
  businessId: string
  calendarConnected?: boolean
  nodeId?: string
}

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  bg: '#0f172a',
  surface: '#1e293b',
  surface2: '#0f172a',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#3b82f6',
  accentHover: '#2563eb',
  border: '#334155',
  connected: '#22c55e',
  pending: '#94a3b8',
  disconnected: '#ef4444',
} as const

// ── Status dot ────────────────────────────────────────────────────────────────
function StatusDot({ status }: { status: WaitlistSummary['calendar_status'] }) {
  const color =
    status === 'connected' ? C.connected : status === 'disconnected' ? C.disconnected : C.pending
  return (
    <span style={{ color, fontSize: '0.6rem', flexShrink: 0, lineHeight: 1 }}>●</span>
  )
}

// ── Small action buttons ───────────────────────────────────────────────────────
function SmallBtn({
  onClick,
  children,
  accent,
}: {
  onClick: () => void
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '0.3rem 0.7rem',
        backgroundColor: accent ? 'rgba(59,130,246,0.12)' : 'rgba(255,255,255,0.04)',
        color: accent ? C.accent : C.textMuted,
        border: `1px solid ${accent ? 'rgba(59,130,246,0.25)' : C.border}`,
        borderRadius: '6px',
        fontSize: '0.78rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap' as const,
      }}
    >
      {children}
    </button>
  )
}

// ── Gear button ───────────────────────────────────────────────────────────────
function GearBtn({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <button
      onClick={onClick}
      title="Settings"
      style={{
        background: 'none',
        border: 'none',
        color: '#64748b',
        cursor: 'pointer',
        padding: '2px 4px',
        fontSize: '0.875rem',
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      ⚙
    </button>
  )
}

// ── Waitlist row ───────────────────────────────────────────────────────────────
interface WaitlistRowProps {
  waitlist: WaitlistSummary
  depth: number
  onSettings: (wl: WaitlistSummary) => void
}

function WaitlistRow({ waitlist, depth, onSettings }: WaitlistRowProps) {
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
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.625rem',
        paddingLeft: `${depth * 16 + 12}px`,
        paddingRight: '12px',
        paddingTop: '8px',
        paddingBottom: '8px',
        borderLeft: depth > 0 ? `2px solid ${C.border}` : 'none',
        marginLeft: depth > 0 ? '12px' : 0,
        cursor: 'pointer',
        borderRadius: '4px',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.03)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
      }}
    >
      <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>📋</span>
      <StatusDot status={waitlist.calendar_status} />
      <span
        style={{
          flex: 1,
          fontSize: '0.875rem',
          color: C.text,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title={waitlist.name}
      >
        {waitlist.name}
      </span>
      <span style={{ fontSize: '0.78rem', color: C.textMuted, flexShrink: 0 }}>
        {statusLabel}
      </span>
      <GearBtn
        onClick={(e) => {
          e.stopPropagation()
          onSettings(waitlist)
        }}
      />
    </div>
  )
}

// ── Tree node (folder/location children) ──────────────────────────────────────
interface TreeNodeProps {
  node: LocationTreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
  onAddWaitlist: (nodeId: string) => void
  onAddFolder: (nodeId: string) => void
  onSettings: (wl: WaitlistSummary) => void
}

function TreeNode({
  node,
  depth,
  expanded,
  onToggle,
  onAddWaitlist,
  onAddFolder,
  onSettings,
}: TreeNodeProps) {
  const isExpanded = expanded.has(node.id)
  const icon = isExpanded ? '▼' : '▶'
  const typeIcon = node.type === 'location' ? '📍' : '📁'
  const hasChildren = node.children.length > 0 || node.waitlists.length > 0

  return (
    <div style={{ marginLeft: depth > 0 ? '16px' : 0 }}>
      {/* Row header */}
      <div
        onClick={() => onToggle(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '10px 12px',
          cursor: 'pointer',
          userSelect: 'none',
          borderRadius: '6px',
          borderLeft: depth > 0 ? `2px solid ${C.border}` : 'none',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.03)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
        }}
      >
        <span style={{ fontSize: '0.875rem', flexShrink: 0 }}>{typeIcon}</span>
        <span
          style={{
            flex: 1,
            fontSize: '0.9rem',
            fontWeight: 600,
            color: C.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={node.name}
        >
          {node.name}
          {node.type === 'location' && node.address && (
            <span style={{ fontWeight: 400, color: C.textMuted, marginLeft: '0.5rem', fontSize: '0.8rem' }}>
              — {node.address}
            </span>
          )}
        </span>
        {hasChildren && (
          <span style={{ color: C.textMuted, fontSize: '0.75rem', flexShrink: 0 }}>{icon}</span>
        )}
      </div>

      {/* Expanded children */}
      {isExpanded && (
        <div style={{ marginTop: '4px', marginBottom: '4px' }}>
          {/* Action buttons */}
          <div
            style={{
              display: 'flex',
              gap: '0.5rem',
              paddingLeft: depth > 0 ? '28px' : '12px',
              paddingBottom: '8px',
              flexWrap: 'wrap',
            }}
          >
            <SmallBtn accent onClick={() => onAddWaitlist(node.id)}>
              + Create Waitlist
            </SmallBtn>
            <SmallBtn onClick={() => onAddFolder(node.id)}>
              + Create Folder
            </SmallBtn>
          </div>

          {/* Sub-folders */}
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

          {/* Waitlists */}
          {node.waitlists.map((wl) => (
            <WaitlistRow
              key={wl.id}
              waitlist={wl}
              depth={depth + 1}
              onSettings={onSettings}
            />
          ))}

          {node.children.length === 0 && node.waitlists.length === 0 && (
            <p
              style={{
                paddingLeft: depth > 0 ? '28px' : '12px',
                color: C.textMuted,
                fontSize: '0.8rem',
                margin: '0 0 8px',
              }}
            >
              No folders or waitlists yet.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Location card (top-level collapsible) ─────────────────────────────────────
interface LocationCardProps {
  node: LocationTreeNode
  defaultExpanded: boolean
  onAddWaitlist: (nodeId: string) => void
  onAddFolder: (nodeId: string) => void
  onSettings: (wl: WaitlistSummary) => void
}

function LocationCard({
  node,
  defaultExpanded,
  onAddWaitlist,
  onAddFolder,
  onSettings,
}: LocationCardProps) {
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
    <div
      style={{
        backgroundColor: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '10px',
        overflow: 'hidden',
        marginBottom: '1rem',
      }}
    >
      {/* Card header */}
      <div
        onClick={() => toggle(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
          padding: '14px 16px',
          cursor: 'pointer',
          userSelect: 'none',
          borderBottom: isExpanded ? `1px solid ${C.border}` : 'none',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'rgba(255,255,255,0.02)'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent'
        }}
      >
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>📍</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: '0.95rem',
              fontWeight: 700,
              color: C.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {node.name}
          </div>
          {node.address && (
            <div
              style={{
                fontSize: '0.78rem',
                color: C.textMuted,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {node.address}
            </div>
          )}
        </div>
        <span style={{ color: C.textMuted, fontSize: '0.75rem', flexShrink: 0 }}>
          {isExpanded ? '▼' : '▶'}
        </span>
      </div>

      {/* Card body */}
      {isExpanded && (
        <div style={{ padding: '12px' }}>
          {/* Top-level action buttons for this location */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '12px', flexWrap: 'wrap' }}>
            <SmallBtn accent onClick={() => onAddWaitlist(node.id)}>
              + Create Waitlist
            </SmallBtn>
            <SmallBtn onClick={() => onAddFolder(node.id)}>
              + Create Folder
            </SmallBtn>
          </div>

          {/* Sub-folders */}
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

          {/* Waitlists directly under location */}
          {node.waitlists.map((wl) => (
            <WaitlistRow
              key={wl.id}
              waitlist={wl}
              depth={0}
              onSettings={onSettings}
            />
          ))}

          {node.children.length === 0 && node.waitlists.length === 0 && (
            <p style={{ color: C.textMuted, fontSize: '0.8rem', margin: 0 }}>
              No folders or waitlists yet. Use the buttons above to add some.
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Modal state union ──────────────────────────────────────────────────────────
type ModalState =
  | { kind: 'none' }
  | { kind: 'location'; parentId: string | null; type: 'location' | 'folder' }
  | { kind: 'waitlist-create'; nodeId: string }
  | { kind: 'waitlist-edit'; waitlist: WaitlistSummary & { nodeId: string } }

// ── LocationsView (exported client component) ─────────────────────────────────
export function LocationsView({ tree, calendarConnected, nodeId }: Props) {
  const router = useRouter()
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })

  // Auto-open WaitlistSetupModal when returning from OAuth with calendarConnected
  useEffect(() => {
    if (calendarConnected && nodeId) {
      setModal({ kind: 'waitlist-create', nodeId })
    }
  }, [calendarConnected, nodeId])

  function handleSuccess() {
    setModal({ kind: 'none' })
    router.refresh()
  }

  function openAddWaitlist(nId: string) {
    setModal({ kind: 'waitlist-create', nodeId: nId })
  }

  function openAddFolder(nId: string) {
    setModal({ kind: 'location', parentId: nId, type: 'folder' })
  }

  function openSettings(wl: WaitlistSummary) {
    // We need nodeId for the edit modal — find it from tree
    setModal({
      kind: 'waitlist-edit',
      waitlist: {
        ...wl,
        // These extra fields aren't in WaitlistSummary; the modal fetches via PATCH
        // We provide defaults so TypeScript is satisfied via the interface mapping
        nodeId: '',
      },
    })
  }

  // Determine default expansion: expand all if only 1 location
  const defaultExpanded = tree.length === 1

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem' }}>
      {/* Page header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.75rem',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}
      >
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 700,
            color: C.text,
            margin: 0,
          }}
        >
          Locations &amp; Waitlists
        </h1>
        <button
          onClick={() => setModal({ kind: 'location', parentId: null, type: 'location' })}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: C.accent,
            color: '#fff',
            border: 'none',
            borderRadius: '7px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          + Add Location
        </button>
      </div>

      {/* Empty state */}
      {tree.length === 0 ? (
        <div
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '3rem 2rem',
            textAlign: 'center',
          }}
        >
          <p style={{ color: C.textMuted, fontSize: '0.9rem', marginBottom: '1.25rem' }}>
            No locations yet. Add your first location to get started.
          </p>
          <button
            onClick={() => setModal({ kind: 'location', parentId: null, type: 'location' })}
            style={{
              padding: '0.625rem 1.25rem',
              backgroundColor: C.accent,
              color: '#fff',
              border: 'none',
              borderRadius: '7px',
              fontWeight: 600,
              fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            + Add Location
          </button>
        </div>
      ) : (
        <div>
          {tree.map((node) => (
            <LocationCard
              key={node.id}
              node={node}
              defaultExpanded={defaultExpanded}
              onAddWaitlist={openAddWaitlist}
              onAddFolder={openAddFolder}
              onSettings={openSettings}
            />
          ))}
        </div>
      )}

      {/* Modals */}
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
            dedicated_calendar_id: null,
            batch_size: 3,
            batch_interval_minutes: 60,
            min_notice_hours: 24,
            min_confirm_lead_hours: 2,
            timezone: 'UTC',
          }}
          onClose={() => setModal({ kind: 'none' })}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
