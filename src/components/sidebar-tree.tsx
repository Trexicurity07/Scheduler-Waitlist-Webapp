'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { LocationTreeNode, WaitlistSummary } from '@/lib/dashboard/location-tree'

interface Props {
  tree: LocationTreeNode[]
}

const STORAGE_KEY = 'sf_sidebar_expanded'

function loadExpanded(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(raw.split(',').filter(Boolean))
  } catch {
    return new Set()
  }
}

function saveExpanded(expanded: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, Array.from(expanded).join(','))
  } catch {
    // ignore
  }
}

const calendarDot: Record<WaitlistSummary['calendar_status'], string> = {
  connected: '#22c55e',
  pending: '#94a3b8',
  disconnected: '#ef4444',
}

interface WaitlistRowProps {
  waitlist: WaitlistSummary
  depth: number
}

function WaitlistRow({ waitlist, depth }: WaitlistRowProps) {
  const router = useRouter()

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: `4px 8px 4px ${depth * 12 + 8}px`,
        color: '#94a3b8',
        fontSize: '0.8rem',
        cursor: 'pointer',
      }}
    >
      <span style={{ color: calendarDot[waitlist.calendar_status], fontSize: '0.6rem', flexShrink: 0 }}>●</span>
      <span
        onClick={() => router.push('/waitlist/' + waitlist.id)}
        title={waitlist.name}
        style={{
          width: '14ch',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        {waitlist.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          router.push('/waitlist/' + waitlist.id + '?settings=1')
        }}
        title="Settings"
        style={{
          background: 'none',
          border: 'none',
          color: '#64748b',
          cursor: 'pointer',
          padding: '0 2px',
          fontSize: '0.75rem',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ⚙
      </button>
    </div>
  )
}

interface TreeNodeProps {
  node: LocationTreeNode
  depth: number
  expanded: Set<string>
  onToggle: (id: string) => void
}

function TreeNode({ node, depth, expanded, onToggle }: TreeNodeProps) {
  const isExpanded = expanded.has(node.id)
  const icon = node.type === 'location' ? '⊙' : isExpanded ? '▼' : '▶'

  return (
    <>
      <div
        onClick={() => onToggle(node.id)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: `4px 8px 4px ${depth * 12 + 8}px`,
          color: '#f8fafc',
          fontSize: '0.8rem',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ flexShrink: 0, fontSize: '0.65rem', color: '#94a3b8' }}>{icon}</span>
        <span
          title={node.name}
          style={{
            width: '14ch',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.name}
        </span>
      </div>
      {isExpanded && (
        <>
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} depth={depth + 1} expanded={expanded} onToggle={onToggle} />
          ))}
          {node.waitlists.map((wl) => (
            <WaitlistRow key={wl.id} waitlist={wl} depth={depth + 1} />
          ))}
        </>
      )}
    </>
  )
}

export function SidebarTree({ tree }: Props) {
  // Start collapsed SSR; read localStorage in useEffect to avoid hydration mismatch
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setExpanded(loadExpanded())
    setHydrated(true)
  }, [])

  function handleToggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      saveExpanded(next)
      return next
    })
  }

  if (tree.length === 0) {
    return (
      <div style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.75rem' }}>
        No locations yet
      </div>
    )
  }

  return (
    <div
      style={{
        overflowX: 'auto',
        overflowY: 'auto',
        flex: 1,
        paddingBottom: 8,
        // Suppress hydration flicker — show after client reads localStorage
        opacity: hydrated ? 1 : 0,
        transition: 'opacity 0.1s',
      }}
    >
      {tree.map((node) => (
        <TreeNode key={node.id} node={node} depth={0} expanded={expanded} onToggle={handleToggle} />
      ))}
    </div>
  )
}
