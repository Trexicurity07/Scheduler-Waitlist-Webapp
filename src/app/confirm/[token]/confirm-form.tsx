'use client'

import { useState } from 'react'
import type { OfferDetails } from '@/lib/confirm/confirm-offer'

const pageStyle = { maxWidth: '480px', margin: '6rem auto', padding: '0 1.5rem' }
const headingStyle = { fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.5rem' }
const textStyle = { color: '#94a3b8', fontSize: '0.875rem', lineHeight: 1.6 as const, margin: '0 0 0.375rem' }

export function ConfirmForm({ token, details }: { token: string; details: OfferDetails }) {
  const [state, setState] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [errorReason, setErrorReason] = useState<string | null>(null)

  async function handleConfirm() {
    setState('submitting')
    const res = await fetch(`/api/confirm/${token}`, { method: 'POST' })
    const body = await res.json()
    if (res.ok && body.ok) {
      setState('success')
    } else {
      setState('error')
      setErrorReason(body.reason ?? 'gone')
    }
  }

  if (state === 'success') {
    return (
      <main style={pageStyle}>
        <h1 style={headingStyle}>You&apos;re all set</h1>
        <p style={textStyle}>Your appointment at {details.businessName} is confirmed.</p>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main style={pageStyle}>
        <h1 style={headingStyle}>Unable to confirm</h1>
        <p style={textStyle}>
          {errorReason === 'already_confirmed'
            ? "You've already confirmed this slot."
            : 'This slot is no longer available — someone else may have already taken it.'}
        </p>
      </main>
    )
  }

  return (
    <main style={pageStyle}>
      <h1 style={headingStyle}>Confirm your appointment</h1>
      <p style={{ ...textStyle, color: '#f8fafc', fontWeight: 500 }}>{details.businessName}</p>
      <p style={textStyle}>
        {new Date(details.startTime).toLocaleString()} – {new Date(details.endTime).toLocaleString()}
      </p>
      {details.slotDescription && (
        <p style={textStyle}>{details.slotDescription}</p>
      )}
      <button
        onClick={handleConfirm}
        disabled={state === 'submitting'}
        style={{
          marginTop: '1.5rem',
          padding: '0.675rem 1.5rem',
          backgroundColor: state === 'submitting' ? '#93c5fd' : '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '7px',
          fontWeight: 600,
          fontSize: '0.875rem',
          cursor: state === 'submitting' ? 'default' : 'pointer',
        }}
      >
        {state === 'submitting' ? 'Confirming…' : 'Confirm this slot'}
      </button>
    </main>
  )
}
