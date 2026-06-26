'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/db/supabase-browser'

const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/waitlist', label: 'Waitlist' },
  { href: '/notifications', label: 'Notifications' },
]

const styles = {
  sidebar: {
    width: '220px',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column' as const,
    flexShrink: 0,
    position: 'sticky' as const,
    top: 0,
    height: '100vh',
  },
  brand: {
    padding: '1.5rem 1.25rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  brandName: {
    color: '#f8fafc',
    fontWeight: 700,
    fontSize: '1.1rem',
    letterSpacing: '-0.01em',
    textDecoration: 'none',
  },
  brandSub: {
    color: '#64748b',
    fontSize: '0.7rem',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
    marginTop: '2px',
  },
  nav: {
    padding: '1rem 0',
    flex: 1,
  },
  link: (active: boolean): React.CSSProperties => ({
    display: 'block',
    padding: '0.625rem 1.25rem',
    color: active ? '#f8fafc' : '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: active ? 600 : 400,
    borderLeft: active ? '3px solid #3b82f6' : '3px solid transparent',
    backgroundColor: active ? 'rgba(59,130,246,0.1)' : 'transparent',
    transition: 'color 0.15s, background-color 0.15s',
  }),
  footer: {
    padding: '1rem 1.25rem',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  logoutBtn: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    backgroundColor: 'transparent',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '6px',
    color: '#94a3b8',
    fontSize: '0.8rem',
    cursor: 'pointer',
    textAlign: 'left' as const,
  },
}

export default function OwnerNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <Link href="/dashboard" style={styles.brandName}>SlotFill</Link>
        <div style={styles.brandSub}>Business portal</div>
      </div>

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

      <div style={styles.footer}>
        <button style={styles.logoutBtn} onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  )
}
