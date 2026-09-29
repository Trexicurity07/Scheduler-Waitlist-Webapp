'use client'

import { useState } from 'react'
import type { OfferDetails } from '@/lib/confirm/confirm-offer'
import { Button } from '@/components/ui/button'

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
      <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <div className="w-full max-w-md">
          <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-green-400 text-xl">✓</span>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">You&apos;re all set</h1>
            <p className="text-sm text-slate-400">Your appointment at {details.businessName} is confirmed.</p>
          </div>
        </div>
      </main>
    )
  }

  if (state === 'error') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <div className="w-full max-w-md">
          <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-xl">✕</span>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">Unable to confirm</h1>
            <p className="text-sm text-slate-400">
              {errorReason === 'already_confirmed'
                ? "You've already confirmed this slot."
                : 'This slot is no longer available — someone else may have already taken it.'}
            </p>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
            <span className="text-green-400 text-xl">📅</span>
          </div>
          <h1 className="text-xl font-semibold text-white mb-2">Confirm your appointment</h1>

          <div className="bg-white/[0.04] rounded-lg p-4 mb-6 text-left space-y-2">
            <p className="text-sm font-medium text-white">{details.businessName}</p>
            <p className="text-sm text-slate-300">
              {new Date(details.startTime).toLocaleString()} – {new Date(details.endTime).toLocaleTimeString()}
            </p>
            {details.slotDescription && (
              <p className="text-sm text-slate-400">{details.slotDescription}</p>
            )}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleConfirm}
              disabled={state === 'submitting'}
              className="flex-1"
            >
              {state === 'submitting' ? 'Confirming…' : 'Confirm this slot'}
            </Button>
            <a
              href={`/confirm/${token}?decline=true`}
              className="flex-1 inline-flex items-center justify-center rounded-md border border-white/[0.12] text-sm font-medium text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors h-10 px-4"
            >
              Decline
            </a>
          </div>
        </div>
      </div>
    </main>
  )
}
