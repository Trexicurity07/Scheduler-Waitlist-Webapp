'use client'

import { useState } from 'react'
import type { PendingOffer } from '@/lib/client-dashboard/manage-own-entries'
import { Button } from '@/components/ui/button'

export default function PendingOffersSection({ offers }: { offers: PendingOffer[] }) {
  const [localOffers, setLocalOffers] = useState(offers)
  const [error, setError] = useState<string | null>(null)

  if (localOffers.length === 0) {
    return <p className="text-slate-500 text-sm py-8 text-center">No pending slot offers.</p>
  }

  async function respond(notificationId: string, action: 'confirm' | 'decline') {
    const res = await fetch(`/api/client/offers/${notificationId}/${action}`, { method: 'POST' })
    if (res.ok) {
      setLocalOffers((prev) => prev.filter((o) => o.notification_id !== notificationId))
    } else {
      const data: unknown = await res.json()
      setError((data as { error?: string }).error ?? `Could not ${action} offer.`)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {localOffers.map((offer) => (
        <div
          key={offer.notification_id}
          className="bg-sky-500/[0.06] border border-sky-500/20 rounded-xl p-4"
        >
          <div className="mb-2">
            <span className="text-sm font-semibold text-white">{offer.business_name}</span>
            {offer.business_type && (
              <span className="text-xs text-slate-500 ml-2">· {offer.business_type}</span>
            )}
          </div>

          {offer.slot_start && (
            <p className="text-sm text-slate-300 mb-1">
              {new Date(offer.slot_start).toLocaleString()}
              {offer.slot_end ? ` – ${new Date(offer.slot_end).toLocaleTimeString()}` : ''}
            </p>
          )}
          {offer.offer_expires_at && (
            <p className="text-xs text-slate-500 mb-4">
              Offer expires {new Date(offer.offer_expires_at).toLocaleString()}
            </p>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={() => respond(offer.notification_id, 'confirm')}>
              Confirm
            </Button>
            <Button size="sm" variant="outline" onClick={() => respond(offer.notification_id, 'decline')}>
              Decline
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
