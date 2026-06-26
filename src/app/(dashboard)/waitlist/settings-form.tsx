'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Business = Database['public']['Tables']['businesses']['Row']

export function SettingsForm({ business }: { business: Business }) {
  const router = useRouter()
  const [batchSize, setBatchSize] = useState(business.batch_size)
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState(business.batch_interval_minutes)
  const [minNoticeHours, setMinNoticeHours] = useState(business.min_notice_hours)
  const [minConfirmLeadHours, setMinConfirmLeadHours] = useState(business.min_confirm_lead_hours)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (minConfirmLeadHours >= minNoticeHours) {
      setError('Confirmation lead time must be less than the minimum notice period.')
      setStatus('error')
      return
    }

    setStatus('submitting')
    const response = await fetch('/api/dashboard/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize, batchIntervalMinutes, minNoticeHours, minConfirmLeadHours }),
    })
    const body = await response.json()

    if (!response.ok || !body.ok) {
      setStatus('error')
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }

    setStatus('saved')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit}>
      <label>
        Batch size (offers sent per round)
        <input type="number" min={1} value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} required />
      </label>
      <label>
        Batch interval (minutes before the next round)
        <input
          type="number"
          min={1}
          value={batchIntervalMinutes}
          onChange={(e) => setBatchIntervalMinutes(Number(e.target.value))}
          required
        />
      </label>
      <label>
        Minimum notice (hours before a cancelled slot is offered)
        <input
          type="number"
          min={1}
          value={minNoticeHours}
          onChange={(e) => setMinNoticeHours(Number(e.target.value))}
          required
        />
      </label>
      <label>
        Minimum confirmation lead time (hours)
        <input
          type="number"
          min={0}
          value={minConfirmLeadHours}
          onChange={(e) => setMinConfirmLeadHours(Number(e.target.value))}
          required
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Saving…' : 'Save settings'}
      </button>
      {status === 'saved' && <p>Saved.</p>}
    </form>
  )
}
