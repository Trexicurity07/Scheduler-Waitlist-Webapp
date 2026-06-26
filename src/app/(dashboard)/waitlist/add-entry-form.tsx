'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export function AddEntryForm() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'error'>('idle')
  const [error, setError] = useState('')

  function toggleDay(day: number) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    const response = await fetch('/api/dashboard/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, timeWindows: [{ days: selectedDays, start, end }] }),
    })
    const body = await response.json()

    if (!response.ok || !body.ok) {
      setStatus('error')
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }

    setIdentifier('')
    setSelectedDays([])
    setStatus('idle')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Client email or phone number
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="email@example.com or 15551234567"
          required
        />
      </label>
      <fieldset>
        <legend>Days available</legend>
        {DAYS.map((day) => (
          <label key={day.value}>
            <input type="checkbox" checked={selectedDays.includes(day.value)} onChange={() => toggleDay(day.value)} />
            {day.label}
          </label>
        ))}
      </fieldset>
      <label>
        From
        <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required />
      </label>
      <label>
        To
        <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === 'submitting' || selectedDays.length === 0}>
        Add to waitlist
      </button>
    </form>
  )
}
