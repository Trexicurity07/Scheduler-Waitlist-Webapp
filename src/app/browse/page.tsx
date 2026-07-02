'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type BizResult = { id: string; name: string; business_type: string; public_slug: string }

const C = {
  bg: '#0f172a',
  surface: '#1e293b',
  border: 'rgba(255,255,255,0.08)',
  borderHover: '#3b82f6',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#3b82f6',
}

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
    <main style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.text, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{
        backgroundColor: C.bg, borderBottom: `1px solid ${C.border}`,
        padding: '0 1.5rem', height: '56px', display: 'flex', alignItems: 'center',
        gap: '2rem', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link href="/" style={{ color: C.text, fontWeight: 700, fontSize: '1rem', textDecoration: 'none', letterSpacing: '-0.01em' }}>
          SlotFill
        </Link>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/client/login" style={{ color: C.textMuted, fontSize: '0.875rem', textDecoration: 'none' }}>Log in</Link>
          <Link href="/client/signup" style={{
            padding: '0.375rem 0.75rem', backgroundColor: C.accent, color: '#fff',
            borderRadius: '6px', fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600,
          }}>Sign up</Link>
        </div>
      </header>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2.5rem 1rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: C.text, margin: '0 0 0.4rem' }}>Browse businesses</h1>
        <p style={{ color: C.textMuted, marginBottom: '1.75rem', fontSize: '0.9rem' }}>
          Find a business and join their waitlist.
        </p>

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by business name…"
          autoFocus
          style={{
            width: '100%', padding: '0.75rem 1rem', backgroundColor: C.surface,
            border: `1px solid ${C.border}`, borderRadius: '8px', color: C.text,
            fontSize: '1rem', outline: 'none', boxSizing: 'border-box', marginBottom: '1.5rem',
          }}
        />

        {loading ? (
          <p style={{ color: C.textMuted, fontSize: '0.875rem' }}>Loading…</p>
        ) : results.length === 0 ? (
          <p style={{ color: C.textMuted, fontSize: '0.875rem' }}>
            {query ? `No businesses found for "${query}".` : 'No businesses available yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: C.surface, border: `1px solid ${hovered ? C.borderHover : C.border}`,
        borderRadius: '10px', padding: '1rem 1.25rem', textAlign: 'left', cursor: 'pointer',
        color: C.text, width: '100%', transition: 'border-color 0.15s',
      }}
    >
      <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.25rem' }}>{biz.name}</div>
      <div style={{ color: C.textMuted, fontSize: '0.8rem' }}>{biz.business_type}</div>
    </button>
  )
}
