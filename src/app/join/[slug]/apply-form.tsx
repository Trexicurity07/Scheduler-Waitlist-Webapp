'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ApplyForm({ slug }: { slug: string }) {
  const router = useRouter()
  const [windows, setWindows] = useState([{ days: [] as number[], start: '09:00', end: '17:00' }])
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

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
    const res = await fetch(`/api/client/apply/${slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_windows: windows }),
    })
    const data: unknown = await res.json()
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Could not submit application.')
      return
    }
    setSubmitted(true)
    setTimeout(() => router.push('/client/dashboard'), 2000)
  }

  if (submitted) {
    return <p>You have been added to the waitlist. Redirecting to your dashboard…</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {windows.map((w, i) => (
        <fieldset key={i}>
          <legend>Preferred time window {i + 1}</legend>
          <div>
            {DAYS.map((label, day) => (
              <label key={day}>
                <input type="checkbox" checked={w.days.includes(day)} onChange={() => toggleDay(i, day)} />
                {label}
              </label>
            ))}
          </div>
          <label>From <input type="time" value={w.start} onChange={(e) => setWindows((prev) => prev.map((x, j) => j === i ? { ...x, start: e.target.value } : x))} /></label>
          <label>To <input type="time" value={w.end} onChange={(e) => setWindows((prev) => prev.map((x, j) => j === i ? { ...x, end: e.target.value } : x))} /></label>
        </fieldset>
      ))}
      <button type="button" onClick={() => setWindows((prev) => [...prev, { days: [], start: '09:00', end: '17:00' }])}>
        Add another time window
      </button>
      <button type="submit">Join waitlist</button>
    </form>
  )
}
