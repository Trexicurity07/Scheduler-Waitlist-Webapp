'use client'

import { useState } from 'react'
import type { PendingOffer } from '@/lib/client-dashboard/manage-own-entries'

export default function PendingOffersSection({ offers }: { offers: PendingOffer[] }) {
  const [localOffers, setLocalOffers] = useState(offers)
  const [error, setError] = useState<string | null>(null)

  if (localOffers.length === 0) {
    return <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No pending slot offers.</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {error && (
        <p role="alert" style={{
          backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5', borderRadius: '6px', padding: '0.625rem 0.875rem',
          fontSize: '0.875rem', margin: 0,
        }}>
          {error}
        </p>
      )}
      {localOffers.map((offer) => (
        <div key={offer.notification_id} style={{
          backgroundColor: 'rgba(14,165,233,0.06)',
          border: '1px solid rgba(14,165,233,0.2)',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
        }}>
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
              {offer.business_name}
            </span>
            {offer.business_type && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                · {offer.business_type}
              </span>
            )}
          </div>

          {offer.slot_start && (
            <p style={{ fontSize: '0.875rem', color: '#cbd5e1', margin: '0 0 0.25rem' }}>
              {new Date(offer.slot_start).toLocaleString()}
              {offer.slot_end ? ` – ${new Date(offer.slot_end).toLocaleTimeString()}` : ''}
            </p>
          )}
          {offer.offer_expires_at && (
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.875rem' }}>
              Offer expires {new Date(offer.offer_expires_at).toLocaleString()}
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => respond(offer.notification_id, 'confirm')}
              style={{
                padding: '0.45rem 1rem', backgroundColor: '#0ea5e9', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Confirm
            </button>
            <button
              onClick={() => respond(offer.notification_id, 'decline')}
              style={{
                padding: '0.45rem 1rem', backgroundColor: 'transparent', color: '#94a3b8',
                border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              Decline
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
