'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { LocationTreeNode, WaitlistSummary } from '@/lib/dashboard/location-tree'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  business: { id: string; name: string; business_type: string; public_slug: string }
  tree: LocationTreeNode[]
  entryCounts: Record<string, number>
}

export function BusinessProfileView({ business, tree, entryCounts }: Props) {
  return (
    <main className="min-h-screen bg-[#0f172a] text-white">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-4 border-b border-white/[0.08] bg-[#0f172a] px-6">
        <Link href="/browse" className="text-sm text-slate-400 hover:text-white">← Browse</Link>
        <Link href="/" className="ml-auto text-base font-bold tracking-tight text-white">SlotFill</Link>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-white">{business.name}</h1>
        <p className="mb-8 text-sm text-slate-400">{business.business_type}</p>

        {tree.length === 0 ? (
          <p className="text-sm text-slate-400">No waitlists available yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
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
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#1e293b]">
      <button
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasContent}
        className={cn(
          'flex w-full items-center justify-between px-5 py-4 text-left',
          hasContent && 'cursor-pointer hover:bg-white/[0.03]'
        )}
      >
        <div>
          <div className="text-base font-semibold text-white">{node.name}</div>
          {node.address && <div className="mt-0.5 text-xs text-slate-400">{node.address}</div>}
        </div>
        {hasContent && (
          <span className="ml-4 shrink-0 text-xs text-slate-500">{expanded ? '▲' : '▼'}</span>
        )}
      </button>

      {expanded && hasContent && (
        <div className="border-t border-white/[0.08] px-5 pb-5 pt-3">
          {node.description && (
            <p className="mb-4 mt-1 text-sm text-slate-400">{node.description}</p>
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
    <div className="mb-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        disabled={!hasContent}
        className={cn(
          'mb-2 flex items-center gap-2 py-1 text-sm font-semibold text-slate-400',
          hasContent && 'cursor-pointer hover:text-white'
        )}
      >
        <span>{expanded ? '▾' : '▸'}</span>
        {node.name}
      </button>
      {expanded && (
        <div className="border-l-2 border-white/[0.08] pl-4">
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
    <div className="mb-2 flex items-center justify-between gap-4 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-white">{waitlist.name}</div>
        {waitlist.description && (
          <div className="mt-0.5 text-xs text-slate-400">{waitlist.description}</div>
        )}
        <div className="mt-1.5 text-xs text-slate-500">~{count} waiting</div>
      </div>
      <Button size="sm" disabled className="shrink-0 opacity-60">
        Enter Waitlist
      </Button>
    </div>
  )
}
