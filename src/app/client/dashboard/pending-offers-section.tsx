'use client'

import { useState } from 'react'
import type { PendingOffer } from '@/lib/client-dashboard/manage-own-entries'

export default function PendingOffersSection({ offers }: { offers: PendingOffer[] }) {
  const [localOffers, setLocalOffers] = useState(offers)
  const [error, setError] = useState<string | null>(null)

  if (localOffers.length === 0) return <p>No pending slot offers.</p>

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
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {localOffers.map((offer) => (
        <div
          key={offer.notification_id}
          style={{ border: '1px solid #ffa', padding: '1rem', marginBottom: '1rem' }}
        >
          <strong>{offer.business_name}</strong>
          {offer.business_type && <span> · {offer.business_type}</span>}
          {offer.slot_start && (
            <p>
              Slot: {new Date(offer.slot_start).toLocaleString()}
              {offer.slot_end ? ` – ${new Date(offer.slot_end).toLocaleTimeString()}` : ''}
            </p>
          )}
          {offer.offer_expires_at && (
            <p>Offer expires: {new Date(offer.offer_expires_at).toLocaleString()}</p>
          )}
          <button onClick={() => respond(offer.notification_id, 'confirm')}>Confirm</button>
          <button onClick={() => respond(offer.notification_id, 'decline')} style={{ marginLeft: '0.5rem' }}>
            Decline
          </button>
        </div>
      ))}
    </div>
  )
}
