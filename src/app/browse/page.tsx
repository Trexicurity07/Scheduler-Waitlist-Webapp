'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'

type BizResult = { id: string; name: string; business_type: string; public_slug: string }

export default function BrowsePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<BizResult[]>([])
  const [loading, setLoading] = useState(true)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const delay = query ? 300 : 0
    timer.current = setTimeout(() => {
      setLoading(true)
      fetch(`/api/browse?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((data: BizResult[]) => { setResults(data); setLoading(false) })
        .catch(() => setLoading(false))
    }, delay)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [query])

  return (
    <main className="min-h-screen bg-[#090e1a] text-white">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,0.04) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <header className="sticky top-0 z-50 flex h-14 items-center gap-8 border-b border-white/[0.07] bg-[#090e1a]/90 px-6 backdrop-blur-md">
        <Link href="/" className="text-base font-bold tracking-tight text-white">
          SlotFill
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link
            href="/client/login"
            className="text-sm text-slate-400 transition-colors hover:text-white"
          >
            Log in
          </Link>
          <Link
            href="/client/signup"
            className="rounded-lg border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-300 transition-colors hover:bg-blue-500/20 hover:text-blue-200"
          >
            Sign up
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1
            className="mb-1.5 text-3xl font-extrabold tracking-tight text-white"
            style={{ letterSpacing: '-0.02em' }}
          >
            Browse businesses
          </h1>
          <p className="text-sm text-slate-400">Find a business and join their waitlist.</p>
        </div>

        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by business name…"
          autoFocus
          className="mb-6 border-white/[0.10] bg-white/[0.03] text-base placeholder:text-slate-500 focus:border-blue-500/40"
        />

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-slate-500">
            {query ? `No businesses found for "${query}".` : 'No businesses available yet.'}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {results.map((biz) => (
              <BizCard key={biz.id} biz={biz} onClick={() => router.push(`/browse/${biz.public_slug}`)} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function BizCard({ biz, onClick }: { biz: BizResult; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl border border-white/[0.07] bg-white/[0.02] px-5 py-4 text-left backdrop-blur-sm transition-all duration-200 hover:border-blue-500/30 hover:bg-white/[0.04]"
    >
      <div className="mb-1 text-base font-semibold text-white">{biz.name}</div>
      <div className="text-xs text-slate-500">{biz.business_type}</div>
    </button>
  )
}
