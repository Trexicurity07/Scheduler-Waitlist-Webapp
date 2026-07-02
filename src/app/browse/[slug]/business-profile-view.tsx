'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LocationTreeNode, WaitlistSummary } from '@/lib/dashboard/location-tree'

const C = {
  bg: '#0f172a',
  surface: '#1e293b',
  surfaceAlt: 'rgba(255,255,255,0.03)',
  border: 'rgba(255,255,255,0.08)',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#3b82f6',
}

interface Props {
  business: { id: string; name: string; business_type: string; public_slug: string }
  tree: LocationTreeNode[]
  entryCounts: Record<string, number>
}

export function BusinessProfileView({ business, tree, entryCounts }: Props) {
  return (
    <main style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{
        backgroundColor: C.bg, borderBottom: `1px solid ${C.border}`,
        padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center',
        gap: '1rem', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link href="/browse" style={{ color: C.textMuted, fontSize: '0.8rem', textDecoration: 'none' }}>← Browse</Link>
        <Link href="/" style={{ color: C.text, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', letterSpacing: '-0.01em', marginLeft: 'auto' }}>
          SlotFill
        </Link>
      </header>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: C.text, margin: '0 0 0.3rem' }}>{business.name}</h1>
        <p style={{ color: C.textMuted, fontSize: '0.875rem', marginBottom: '2rem' }}>{business.business_type}</p>

        {tree.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: '0.9rem' }}>No waitlists available yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {tree.map((node) => (
              <LocationCard key={node.id} node={node} entryCounts={entryCounts} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function LocationCard({ node, entryCounts }: { node: LocationTreeNode; entryCounts: Record<string, number> }) {
  const [expanded, setExpanded] = useState(false)
  const hasContent = node.waitlists.length > 0 || node.children.length > 0

  return (
    <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: '10px', overflow: 'hidden' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasContent}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: hasContent ? 'pointer' : 'default',
          color: C.text, textAlign: 'left',
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '1rem' }}>{node.name}</div>
          {node.address && <div style={{ color: C.textMuted, fontSize: '0.8rem', marginTop: '0.15rem' }}>{node.address}</div>}
        </div>
        {hasContent && (
          <span style={{ color: C.textMuted, fontSize: '0.75rem', marginLeft: '1rem', flexShrink: 0 }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </button>

      {expanded && hasContent && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '0.75rem 1.25rem 1.25rem' }}>
          {node.description && (
            <p style={{ color: C.textMuted, fontSize: '0.85rem', marginBottom: '1rem', marginTop: '0.25rem' }}>
              {node.description}
            </p>
          )}

          {node.children.map((child) => (
            <FolderSection key={child.id} node={child} entryCounts={entryCounts} />
          ))}

          {node.waitlists.map((wl) => (
            <WaitlistRow key={wl.id} waitlist={wl} count={entryCounts[wl.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  )
}

function FolderSection({ node, entryCounts }: { node: LocationTreeNode; entryCounts: Record<string, number> }) {
  const [expanded, setExpanded] = useState(false)
  const hasContent = node.waitlists.length > 0 || node.children.length > 0

  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <button
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasContent}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none',
          border: 'none', cursor: hasContent ? 'pointer' : 'default', color: C.textMuted,
          fontSize: '0.85rem', fontWeight: 600, padding: '0.25rem 0', marginBottom: '0.5rem',
        }}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        {node.name}
      </button>

      {expanded && (
        <div style={{ paddingLeft: '1rem', borderLeft: `2px solid ${C.border}` }}>
          {node.children.map((child) => (
            <FolderSection key={child.id} node={child} entryCounts={entryCounts} />
          ))}
          {node.waitlists.map((wl) => (
            <WaitlistRow key={wl.id} waitlist={wl} count={entryCounts[wl.id] ?? 0} />
          ))}
        </div>
      )}
    </div>
  )
}

function WaitlistRow({ waitlist, count }: { waitlist: WaitlistSummary; count: number }) {
  return (
    <div style={{
      backgroundColor: C.surfaceAlt, border: `1px solid ${C.border}`, borderRadius: '8px',
      padding: '0.875rem 1rem', marginBottom: '0.5rem', display: 'flex',
      alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', color: C.text }}>{waitlist.name}</div>
        {waitlist.description && (
          <div style={{ color: C.textMuted, fontSize: '0.8rem', marginTop: '0.2rem' }}>{waitlist.description}</div>
        )}
        <div style={{ color: C.textMuted, fontSize: '0.75rem', marginTop: '0.35rem' }}>~{count} waiting</div>
      </div>
      <button
        disabled
        style={{
          padding: '0.4rem 0.875rem', backgroundColor: C.accent, color: '#fff',
          border: 'none', borderRadius: '6px', fontWeight: 600, fontSize: '0.8rem',
          cursor: 'not-allowed', opacity: 0.6, flexShrink: 0,
        }}
      >
        Enter Waitlist
      </button>
    </div>
  )
}
