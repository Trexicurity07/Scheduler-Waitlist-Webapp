'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const timeInputStyle = {
  padding: '0.375rem 0.5rem',
  borderRadius: '5px',
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: '0.8rem',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  colorScheme: 'dark' as const,
}

export default function ApplyForm({ slug }: { slug: string }) {
  const router = useRouter()
  const [windows, setWindows] = useState([{ days: [] as number[], start: '09:00', end: '17:00' }])
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  function toggleDay(windowIdx: number, day: number) {
    setWindows((prev) => prev.map((w, i) =>
      i !== windowIdx ? w : {
        ...w,
        days: w.days.includes(day) ? w.days.filter((d) => d !== day) : [...w.days, day].sort(),
      }
    ))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (windows.some((w) => w.days.length === 0)) {
      setError('Please select at least one day for each time window.')
      return
    }
    setLoading(true)
    const res = await fetch(`/api/client/apply/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_windows: windows }),
    })
    const data: unknown = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Could not submit application.')
      return
    }
    setSubmitted(true)
    setTimeout(() => router.push('/client/dashboard'), 2000)
  }

  if (submitted) {
    return (
      <p style={{ color: '#86efac', fontSize: '0.875rem' }}>
        You have been added to the waitlist. Redirecting to your dashboard…
      </p>
    )
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {error && (
        <p role="alert" style={{
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5', borderRadius: '6px', padding: '0.625rem 0.875rem',
          fontSize: '0.875rem', margin: 0,
        }}>
          {error}
        </p>
      )}

      {windows.map((w, i) => (
        <div key={i} style={{
          backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', padding: '1rem 1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.75rem',
        }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
            Time window {windows.length > 1 ? i + 1 : ''}
          </div>

          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {DAYS.map((label, day) => {
              const active = w.days.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i, day)}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '5px',
                    border: '1px solid',
                    borderColor: active ? '#0ea5e9' : 'rgba(255,255,255,0.12)',
                    backgroundColor: active ? 'rgba(14,165,233,0.15)' : 'transparent',
                    color: active ? '#7dd3fc' : '#64748b',
                    fontSize: '0.75rem',
                    fontWeight: active ? 600 : 400,
                    cursor: 'pointer',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>From</span>
            <input
              type="time"
              value={w.start}
              style={timeInputStyle}
              onChange={(e) => setWindows((prev) => prev.map((x, j) => j === i ? { ...x, start: e.target.value } : x))}
            />
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>–</span>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>To</span>
            <input
              type="time"
              value={w.end}
              style={timeInputStyle}
              onChange={(e) => setWindows((prev) => prev.map((x, j) => j === i ? { ...x, end: e.target.value } : x))}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setWindows((prev) => [...prev, { days: [], start: '09:00', end: '17:00' }])}
        style={{
          padding: '0.5rem',
          backgroundColor: 'transparent',
          border: '1px dashed rgba(255,255,255,0.15)',
          borderRadius: '8px',
          color: '#64748b',
          fontSize: '0.8rem',
          cursor: 'pointer',
        }}
      >
        + Add another time window
      </button>

      <button
        type="submit"
        disabled={loading}
        style={{
          padding: '0.675rem',
          backgroundColor: loading ? '#7dd3fc' : '#0ea5e9',
          color: '#fff',
          border: 'none',
          borderRadius: '7px',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: loading ? 'default' : 'pointer',
        }}
      >
        {loading ? 'Joining…' : 'Join waitlist'}
      </button>
    </form>
  )
}
