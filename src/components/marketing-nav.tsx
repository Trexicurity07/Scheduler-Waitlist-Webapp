'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

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

  return (
    <nav className="sticky top-0 z-50 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-[#0f172a] px-10">
      <Link href="/" className="mr-6 text-lg font-bold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
        SlotFill
      </Link>

      <div className="flex flex-1 gap-0.5">
        <Link
          href="/about"
          className={cn(
            'rounded-md px-3 py-1.5 text-sm transition-colors',
            pathname === '/about' ? 'bg-white/[0.07] font-semibold text-white' : 'text-slate-400 hover:text-white'
          )}
        >
          About
        </Link>
        <Link
          href="/pricing"
          className={cn(
            'rounded-md px-3 py-1.5 text-sm transition-colors',
            pathname === '/pricing' ? 'bg-white/[0.07] font-semibold text-white' : 'text-slate-400 hover:text-white'
          )}
        >
          Pricing
        </Link>
      </div>

      <div className="flex items-center gap-2.5">
        <div className="relative" onMouseEnter={openLogin} onMouseLeave={closeLogin}>
          <button className="rounded-md border border-white/[0.14] px-3.5 py-1.5 text-sm text-slate-300 hover:border-white/30 hover:text-white">
            Log in ▾
          </button>
          {loginOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[165px] rounded-lg border border-white/10 bg-[#1e293b] p-1.5 shadow-xl">
              <Link href="/login" className="block rounded-md px-3.5 py-2 text-sm text-slate-300 hover:bg-white/[0.07] hover:text-white">
                Business login
              </Link>
              <Link href="/client/login" className="block rounded-md px-3.5 py-2 text-sm text-slate-300 hover:bg-white/[0.07] hover:text-white">
                Client login
              </Link>
            </div>
          )}
        </div>

        <div className="relative" onMouseEnter={openSignup} onMouseLeave={closeSignup}>
          <button className="rounded-md bg-blue-500 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-blue-400">
            Sign up ▾
          </button>
          {signupOpen && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-[165px] rounded-lg border border-white/10 bg-[#1e293b] p-1.5 shadow-xl">
              <Link href="/signup" className="block rounded-md px-3.5 py-2 text-sm text-slate-300 hover:bg-white/[0.07] hover:text-white">
                Business signup
              </Link>
              <Link href="/client/signup" className="block rounded-md px-3.5 py-2 text-sm text-slate-300 hover:bg-white/[0.07] hover:text-white">
                Client signup
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
