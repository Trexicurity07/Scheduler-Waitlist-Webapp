'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { smallInputStyle, smallLabelStyle, colors } from '@/lib/ui/theme'

interface WaitlistConfig {
  batch_size: number
  batch_interval_minutes: number
  min_notice_hours: number
  min_confirm_lead_hours: number
  timezone: string
}

interface Props {
  waitlistId: string
  waitlist: WaitlistConfig
}

export function SettingsForm({ waitlistId, waitlist }: Props) {
  const router = useRouter()
  const [batchSize, setBatchSize] = useState(waitlist.batch_size)
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState(waitlist.batch_interval_minutes)
  const [minNoticeHours, setMinNoticeHours] = useState(waitlist.min_notice_hours)
  const [minConfirmLeadHours, setMinConfirmLeadHours] = useState(waitlist.min_confirm_lead_hours)
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
    const response = await fetch(`/api/dashboard/waitlists/${waitlistId}`, {
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

  const unit: React.CSSProperties = { fontSize: '0.75rem', color: colors.textSecondary, whiteSpace: 'nowrap' }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
      <label style={smallLabelStyle}>
        Batch size
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="number" min={1} value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))} required style={smallInputStyle} />
          <span style={unit}>offers / round</span>
        </div>
      </label>

      <label style={smallLabelStyle}>
        Batch interval
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="number" min={1} value={batchIntervalMinutes} onChange={(e) => setBatchIntervalMinutes(Number(e.target.value))} required style={smallInputStyle} />
          <span style={unit}>min</span>
        </div>
      </label>

      <label style={smallLabelStyle}>
        Minimum notice
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="number" min={1} value={minNoticeHours} onChange={(e) => setMinNoticeHours(Number(e.target.value))} required style={smallInputStyle} />
          <span style={unit}>hrs</span>
        </div>
      </label>

      <label style={smallLabelStyle}>
        Confirm lead time
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input type="number" min={0} value={minConfirmLeadHours} onChange={(e) => setMinConfirmLeadHours(Number(e.target.value))} required style={smallInputStyle} />
          <span style={unit}>hrs</span>
        </div>
      </label>

      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.875rem', marginTop: '0.25rem' }}>
        <button type="submit" disabled={status === 'submitting'} style={{
          padding: '0.55rem 1.25rem',
          backgroundColor: status === 'submitting' ? '#93c5fd' : colors.accent,
          color: '#fff', border: 'none', borderRadius: '7px',
          fontWeight: 600, fontSize: '0.875rem', cursor: status === 'submitting' ? 'default' : 'pointer',
        }}>
          {status === 'submitting' ? 'Saving…' : 'Save settings'}
        </button>
        {status === 'saved' && <span style={{ fontSize: '0.8rem', color: '#86efac', fontWeight: 500 }}>Saved</span>}
        {error && <span role="alert" style={{ fontSize: '0.8rem', color: colors.errorText }}>{error}</span>}
      </div>
    </form>
  )
}
