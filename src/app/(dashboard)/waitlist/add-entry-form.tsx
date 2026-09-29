'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
]

interface Props {
  waitlistId: string
}

export function AddEntryForm({ waitlistId }: Props) {
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
    const response = await fetch(`/api/dashboard/waitlists/${waitlistId}/entries`, {
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

  const disabled = status === 'submitting' || selectedDays.length === 0

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="identifier" className="text-slate-300">Client email or phone</Label>
        <Input
          id="identifier"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="email@example.com or +15551234567"
          required
          className="bg-[#0f172a] border-white/[0.12] text-white placeholder:text-slate-600"
        />
      </div>

      <div>
        <p className="text-xs font-medium text-slate-300 mb-2">Days available</p>
        <div className="flex gap-1.5 flex-wrap">
          {DAYS.map((day) => {
            const active = selectedDays.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={cn(
                  'px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer',
                  active
                    ? 'border-blue-500/40 bg-blue-500/15 text-blue-300 font-semibold'
                    : 'border-white/[0.12] bg-transparent text-slate-500 hover:text-slate-300'
                )}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="start" className="text-slate-300">From</Label>
          <Input
            id="start"
            type="time"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
            className="bg-[#0f172a] border-white/[0.12] text-white"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="end" className="text-slate-300">To</Label>
          <Input
            id="end"
            type="time"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            required
            className="bg-[#0f172a] border-white/[0.12] text-white"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-400">{error}</p>
      )}

      <Button type="submit" disabled={disabled} className="w-full">
        {status === 'submitting' ? 'Adding…' : 'Add to waitlist'}
      </Button>
    </form>
  )
}
