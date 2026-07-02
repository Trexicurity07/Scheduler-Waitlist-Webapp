'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/waitlist', label: 'Waitlist' },
  { href: '/notifications', label: 'Notifications' },
]

const styles = {
  header: {
    backgroundColor: '#0f172a',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 1.5rem',
    height: '56px',
    gap: '2rem',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    flexShrink: 0,
  },
  brand: {
    color: '#f8fafc',
    fontWeight: 700,
    fontSize: '1rem',
    textDecoration: 'none',
    letterSpacing: '-0.01em',
    whiteSpace: 'nowrap' as const,
  },
  brandSub: {
    color: '#64748b',
    fontSize: '0.75rem',
    whiteSpace: 'nowrap' as const,
  },
  divider: {
    width: '1px',
    height: '20px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexShrink: 0,
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    flex: 1,
  },
  link: (active: boolean): React.CSSProperties => ({
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    color: active ? '#f8fafc' : '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 400,
    backgroundColor: active ? 'rgba(59,130,246,0.15)' : 'transparent',
  }),
  actions: {
    display: 'flex',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  logoutBtn: {
    padding: '0.375rem 0.875rem',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.8rem',
    cursor: 'pointer',
  },
}

export default function OwnerNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/owner/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <header style={styles.header}>
      <Link href="/dashboard" style={styles.brand}>SlotFill</Link>
      <span style={styles.brandSub}>Business</span>
      <div style={styles.divider} />
      <nav style={styles.nav}>
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} style={styles.link(active)}>
              {label}
            </Link>
          )
        })}
      </nav>
      <div style={styles.actions}>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </header>
  )
}
