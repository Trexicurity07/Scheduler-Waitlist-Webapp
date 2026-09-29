'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/waitlist', label: 'Waitlist' },
  { href: '/notifications', label: 'Notifications' },
]

export default function OwnerNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/owner/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header className="sticky top-0 z-[100] flex items-center h-14 px-6 bg-[#0f172a] border-b border-white/[0.08] gap-8 shrink-0">
      <Link href="/dashboard" className="text-sm font-bold text-white tracking-tight whitespace-nowrap">
        SlotFill
      </Link>
      <span className="text-xs text-slate-500 whitespace-nowrap">Business</span>
      <div className="w-px h-5 bg-white/10 shrink-0" />
      <nav className="flex items-center gap-1 flex-1">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm transition-colors',
                active ? 'bg-blue-500/15 text-white font-semibold' : 'text-slate-400 hover:text-white'
              )}
            >
              {label}
            </Link>
          )
        })}
      </nav>
      <div className="ml-auto">
        <button
          onClick={handleLogout}
          className="px-3.5 py-1.5 text-xs text-slate-400 border border-white/[0.15] rounded-md hover:text-white hover:border-white/30 transition-colors bg-transparent cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
