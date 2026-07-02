'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function MarketingNav() {
  const pathname = usePathname()
  const [loginOpen, setLoginOpen] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const loginTimer = useRef<NodeJS.Timeout | undefined>(undefined)
  const signupTimer = useRef<NodeJS.Timeout | undefined>(undefined)

  function openLogin() { clearTimeout(loginTimer.current); setLoginOpen(true) }
  function closeLogin() { loginTimer.current = setTimeout(() => setLoginOpen(false), 120) }
  function openSignup() { clearTimeout(signupTimer.current); setSignupOpen(true) }
  function closeSignup() { signupTimer.current = setTimeout(() => setSignupOpen(false), 120) }

  const navLink = (href: string): React.CSSProperties => ({
    padding: '0.375rem 0.75rem',
    borderRadius: '6px',
    color: pathname === href ? '#f8fafc' : '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.875rem',
    fontWeight: pathname === href ? 600 : 400,
    backgroundColor: pathname === href ? 'rgba(255,255,255,0.07)' : 'transparent',
  })

  const dropdownPanel: React.CSSProperties = {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    right: 0,
    backgroundColor: '#1e293b',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '0.375rem',
    minWidth: '165px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.45)',
    zIndex: 100,
  }

  const dropdownItem: React.CSSProperties = {
    display: 'block',
    padding: '0.5rem 0.875rem',
    color: '#cbd5e1',
    textDecoration: 'none',
    fontSize: '0.875rem',
    borderRadius: '6px',
    whiteSpace: 'nowrap',
  }

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 50,
      backgroundColor: '#0f172a',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center',
      padding: '0 2.5rem', height: '64px', gap: '1rem',
    }}>
      <Link href="/about" style={{
        color: '#f8fafc', fontWeight: 700, fontSize: '1.15rem',
        textDecoration: 'none', letterSpacing: '-0.02em', marginRight: '1.5rem',
      }}>
        SlotFill
      </Link>

      <div style={{ display: 'flex', gap: '0.125rem', flex: 1 }}>
        <Link href="/about" style={navLink('/about')}>About</Link>
        <Link href="/pricing" style={navLink('/pricing')}>Pricing</Link>
      </div>

      <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
        <div style={{ position: 'relative' }} onMouseEnter={openLogin} onMouseLeave={closeLogin}>
          <button style={{
            padding: '0.4rem 0.875rem', backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.14)', borderRadius: '6px',
            color: '#cbd5e1', fontSize: '0.875rem', cursor: 'pointer',
          }}>
            Log in ▾
          </button>
          {loginOpen && (
            <div style={dropdownPanel}>
              <Link href="/login" style={dropdownItem}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                Business login
              </Link>
              <Link href="/client/login" style={dropdownItem}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                Client login
              </Link>
            </div>
          )}
        </div>

        <div style={{ position: 'relative' }} onMouseEnter={openSignup} onMouseLeave={closeSignup}>
          <button style={{
            padding: '0.4rem 0.875rem', backgroundColor: '#3b82f6',
            border: 'none', borderRadius: '6px',
            color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
          }}>
            Sign up ▾
          </button>
          {signupOpen && (
            <div style={dropdownPanel}>
              <Link href="/signup" style={dropdownItem}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                Business signup
              </Link>
              <Link href="/client/signup" style={dropdownItem}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                Client signup
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
