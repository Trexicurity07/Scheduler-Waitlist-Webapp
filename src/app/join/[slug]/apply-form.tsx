'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

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
      <div className="rounded-lg bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
        You have been added to the waitlist. Redirecting to your dashboard…
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {windows.map((w, i) => (
        <div
          key={i}
          className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-4 space-y-3"
        >
          <p className="text-xs font-semibold text-slate-300">
            Time window{windows.length > 1 ? ` ${i + 1}` : ''}
          </p>

          <div className="flex gap-1.5 flex-wrap">
            {DAYS.map((label, day) => {
              const active = w.days.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(i, day)}
                  className={cn(
                    'px-2.5 py-1 rounded-md border text-xs font-medium transition-colors',
                    active
                      ? 'border-sky-500/50 bg-sky-500/15 text-sky-300'
                      : 'border-white/[0.12] text-slate-500 hover:text-slate-300 hover:border-white/20'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">From</span>
            <input
              type="time"
              value={w.start}
              className="px-2 py-1 rounded-md border border-white/[0.12] text-xs bg-[#0f172a] text-white [color-scheme:dark]"
              onChange={(e) => setWindows((prev) => prev.map((x, j) => j === i ? { ...x, start: e.target.value } : x))}
            />
            <span className="text-slate-500 text-xs">–</span>
            <span className="text-xs text-slate-400">To</span>
            <input
              type="time"
              value={w.end}
              className="px-2 py-1 rounded-md border border-white/[0.12] text-xs bg-[#0f172a] text-white [color-scheme:dark]"
              onChange={(e) => setWindows((prev) => prev.map((x, j) => j === i ? { ...x, end: e.target.value } : x))}
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setWindows((prev) => [...prev, { days: [], start: '09:00', end: '17:00' }])}
        className="w-full py-2.5 border border-dashed border-white/[0.15] rounded-xl text-xs text-slate-500 hover:text-slate-300 hover:border-white/25 transition-colors"
      >
        + Add another time window
      </button>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Joining…' : 'Join waitlist'}
      </Button>
    </form>
  )
}
