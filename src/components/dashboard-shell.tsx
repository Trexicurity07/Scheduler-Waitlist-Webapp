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
  // SSR default = open (avoids hydration mismatch)
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

  // On the waitlist management page — no sidebar
  if (pathname === '/waitlist') {
    return <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
  }

  return (
    <div style={{ display: 'flex', flex: 1, minWidth: 0, minHeight: 0 }}>
      {open ? (
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            backgroundColor: '#1e293b',
            borderRight: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
          }}
        >
          <button
            onClick={toggle}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: '1px solid #334155',
              color: '#94a3b8',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '8px 12px',
              textAlign: 'right',
              flexShrink: 0,
              letterSpacing: '0.02em',
            }}
          >
            ← Hide
          </button>
          <SidebarTree tree={tree} />
        </aside>
      ) : (
        <button
          onClick={toggle}
          title="Show sidebar"
          style={{
            width: 20,
            flexShrink: 0,
            backgroundColor: '#1e293b',
            border: 'none',
            borderRight: '1px solid #334155',
            color: '#94a3b8',
            fontSize: '0.65rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            writingMode: 'vertical-rl',
          }}
        >
          →
        </button>
      )}
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
