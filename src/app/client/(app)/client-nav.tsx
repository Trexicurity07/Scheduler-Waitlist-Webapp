'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/client/dashboard', label: 'My Waitlists' },
  { href: '/browse', label: 'Browse' },
]

export default function ClientNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/client/logout', { method: 'POST' })
    router.push('/client/login')
  }

  return (
    <header className="h-14 bg-[#0f172a] border-b border-white/[0.06] flex items-center px-6 sticky top-0 z-50">
      <Link href="/client/dashboard" className="font-semibold text-white text-sm tracking-tight mr-6">
        SlotFill
      </Link>
      <div className="w-px h-5 bg-white/10 mr-6" />
      <nav className="flex items-center gap-1 flex-1">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-500/10 text-blue-400'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>
      <button
        onClick={handleLogout}
        className="text-xs text-slate-400 hover:text-white border border-white/[0.12] hover:border-white/20 rounded-md px-3 py-1.5 transition-colors"
      >
        Sign out
      </button>
    </header>
  )
}
