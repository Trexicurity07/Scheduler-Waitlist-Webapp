'use client'

import { useState } from 'react'
import type { OfferDetails } from '@/lib/confirm/confirm-offer'

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
      <main>
        <h1>You&apos;re all set</h1>
        <p>Your appointment at {details.businessName} is confirmed.</p>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main>
        <h1>Unable to confirm</h1>
        <p>
          {errorReason === 'already_confirmed'
            ? "You've already confirmed this slot."
            : 'This slot is no longer available — someone else may have already taken it.'}
        </p>
      </main>
    )
  }

  return (
    <main>
      <h1>Confirm your appointment at {details.businessName}</h1>
      <p>
        {new Date(details.startTime).toLocaleString()} – {new Date(details.endTime).toLocaleString()}
      </p>
      <p>{details.slotDescription}</p>
      <button onClick={handleConfirm} disabled={state === 'submitting'}>
        {state === 'submitting' ? 'Confirming…' : 'Confirm this slot'}
      </button>
    </main>
  )
}
