'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { SidebarTree } from './sidebar-tree'
import type { LocationTreeNode } from '@/lib/dashboard/location-tree'

interface Props {
  children: React.ReactNode
  tree: LocationTreeNode[]
}

const STORAGE_KEY = 'sf_sidebar_open'

export function DashboardShell({ children, tree }: Props) {
  const pathname = usePathname()
  const [open, setOpen] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) setOpen(stored === 'true')
  }, [])

  const toggle = () => {
    setOpen((v) => {
      localStorage.setItem(STORAGE_KEY, String(!v))
      return !v
    })
  }

  if (pathname === '/waitlist') {
    return <div className="relative z-10 flex-1 min-w-0 px-8 py-7">{children}</div>
  }

  return (
    <div className="relative z-10 flex flex-1 min-w-0 min-h-0">
      {open ? (
        <aside className="w-[220px] shrink-0 bg-white/[0.02] backdrop-blur-md border-r border-white/[0.06] flex flex-col overflow-y-auto">
          <button
            onClick={toggle}
            className="text-right text-xs text-slate-500 hover:text-slate-300 px-3 py-2 border-b border-white/[0.06] cursor-pointer bg-transparent shrink-0 tracking-wide transition-colors"
          >
            ← Hide
          </button>
          <SidebarTree tree={tree} />
        </aside>
      ) : (
        <button
          onClick={toggle}
          title="Show sidebar"
          className="w-5 shrink-0 bg-white/[0.02] backdrop-blur-md border-r border-white/[0.06] text-slate-500 hover:text-slate-300 cursor-pointer flex items-center justify-center p-0 transition-colors"
          style={{ writingMode: 'vertical-rl', fontSize: '0.65rem' }}
        >
          →
        </button>
      )}
      <div className="flex-1 min-w-0 overflow-auto px-8 py-7">
        {children}
      </div>
    </div>
  )
}
