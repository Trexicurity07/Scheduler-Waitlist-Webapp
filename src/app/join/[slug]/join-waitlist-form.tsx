'use client'

import { useState, type FormEvent } from 'react'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

export function JoinWaitlistForm({ businessSlug }: { businessSlug: string }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [start, setStart] = useState('09:00')
  const [end, setEnd] = useState('17:00')
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  function toggleDay(day: number) {
    setSelectedDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setStatus('submitting')
    setError('')

    const response = await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessSlug,
        name,
        email,
        phone,
        timeWindows: [{ days: selectedDays, start, end }],
      }),
    })
    const body = await response.json()

    if (!response.ok || !body.ok) {
      setStatus('error')
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }
    setStatus('success')
  }

  if (status === 'success') {
    return <p>Check your email to confirm your spot on the waitlist.</p>
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} required />
      </label>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Mobile number
        <input value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </label>
      <fieldset>
        <legend>Days you&apos;re available</legend>
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
        Join waitlist
      </button>
    </form>
  )
}
