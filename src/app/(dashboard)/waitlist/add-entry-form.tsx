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

const inputStyle = {
  padding: '0.5rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'flex' as const,
  flexDirection: 'column' as const,
  gap: '0.375rem',
  fontSize: '0.8rem',
  fontWeight: 500 as const,
  color: '#374151',
}

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
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <label style={labelStyle}>
        Client email or phone
        <input
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="email@example.com or +15551234567"
          required
          style={inputStyle}
        />
      </label>

      <div>
        <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#374151', marginBottom: '0.5rem' }}>
          Days available
        </div>
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
          {DAYS.map((day) => {
            const active = selectedDays.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                style={{
                  padding: '0.3rem 0.6rem',
                  borderRadius: '5px',
                  border: '1px solid',
                  borderColor: active ? '#3b82f6' : '#e2e8f0',
                  backgroundColor: active ? '#eff6ff' : '#fff',
                  color: active ? '#1d4ed8' : '#64748b',
                  fontSize: '0.75rem',
                  fontWeight: active ? 600 : 400,
                  cursor: 'pointer',
                }}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <label style={labelStyle}>
          From
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} required style={inputStyle} />
        </label>
        <label style={labelStyle}>
          To
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required style={inputStyle} />
        </label>
      </div>

      {error && (
        <p role="alert" style={{ color: '#dc2626', fontSize: '0.8rem', margin: 0 }}>{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting' || selectedDays.length === 0}
        style={{
          padding: '0.6rem',
          backgroundColor: status === 'submitting' || selectedDays.length === 0 ? '#93c5fd' : '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '7px',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: status === 'submitting' || selectedDays.length === 0 ? 'default' : 'pointer',
        }}
      >
        {status === 'submitting' ? 'Adding…' : 'Add to waitlist'}
      </button>
    </form>
  )
}
