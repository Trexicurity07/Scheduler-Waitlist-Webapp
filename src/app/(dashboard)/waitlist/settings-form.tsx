'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import type { Database } from '@/types/database'

type Business = Database['public']['Tables']['businesses']['Row']

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
    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
      <label style={labelStyle}>
        Batch size
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            min={1}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            required
            style={inputStyle}
          />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>offers / round</span>
        </div>
      </label>

      <label style={labelStyle}>
        Batch interval
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            min={1}
            value={batchIntervalMinutes}
            onChange={(e) => setBatchIntervalMinutes(Number(e.target.value))}
            required
            style={inputStyle}
          />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>min</span>
        </div>
      </label>

      <label style={labelStyle}>
        Minimum notice
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            min={1}
            value={minNoticeHours}
            onChange={(e) => setMinNoticeHours(Number(e.target.value))}
            required
            style={inputStyle}
          />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>hrs</span>
        </div>
      </label>

      <label style={labelStyle}>
        Confirm lead time
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input
            type="number"
            min={0}
            value={minConfirmLeadHours}
            onChange={(e) => setMinConfirmLeadHours(Number(e.target.value))}
            required
            style={inputStyle}
          />
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>hrs</span>
        </div>
      </label>

      <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.875rem', marginTop: '0.25rem' }}>
        <button
          type="submit"
          disabled={status === 'submitting'}
          style={{
            padding: '0.55rem 1.25rem',
            backgroundColor: status === 'submitting' ? '#93c5fd' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '7px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: status === 'submitting' ? 'default' : 'pointer',
          }}
        >
          {status === 'submitting' ? 'Saving…' : 'Save settings'}
        </button>
        {status === 'saved' && (
          <span style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 500 }}>Saved</span>
        )}
        {error && (
          <span role="alert" style={{ fontSize: '0.8rem', color: '#dc2626' }}>{error}</span>
        )}
      </div>
    </form>
  )
}
