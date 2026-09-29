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
    <main className="min-h-screen bg-[#0f172a] text-white">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-8 border-b border-white/[0.08] bg-[#0f172a] px-6">
        <Link href="/" className="text-base font-bold tracking-tight text-white">
          SlotFill
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <Link href="/client/login" className="text-sm text-slate-400 hover:text-white">Log in</Link>
          <Link href="/client/signup" className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-400">
            Sign up
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="mb-1 text-2xl font-bold text-white">Browse businesses</h1>
        <p className="mb-7 text-sm text-slate-400">Find a business and join their waitlist.</p>

        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by business name…"
          autoFocus
          className="mb-6 bg-[#1e293b] text-base placeholder:text-slate-500"
        />

        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : results.length === 0 ? (
          <p className="text-sm text-slate-400">
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
      className="w-full rounded-xl border border-white/[0.08] bg-[#1e293b] px-5 py-4 text-left transition-colors hover:border-blue-500/60"
    >
      <div className="mb-1 text-base font-semibold text-white">{biz.name}</div>
      <div className="text-xs text-slate-400">{biz.business_type}</div>
    </button>
  )
}
