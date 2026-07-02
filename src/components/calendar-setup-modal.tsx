'use client'

import { useState } from 'react'

export function CalendarSetupModal({
  defaultOpen = false,
  triggerLabel,
}: {
  defaultOpen?: boolean
  triggerLabel?: string
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <>
      {triggerLabel && !open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            padding: '0.675rem 1.25rem',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: 'pointer',
          }}
        >
          {triggerLabel}
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              backgroundColor: '#1e293b',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '12px',
              padding: '2rem',
              maxWidth: '420px',
              width: '100%',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.75rem' }}>
              Connect your Google Calendar
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0 0 1.5rem', lineHeight: 1.6 }}>
              SlotFill monitors your Google Calendar for cancellations and automatically
              notifies your waitlist. Connecting takes about 2 minutes.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <a
                href="/api/oauth/google/start"
                style={{
                  display: 'block',
                  padding: '0.75rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: '#fff',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                Connect with Google
              </a>
              <button
                onClick={() => setOpen(false)}
                style={{
                  padding: '0.625rem',
                  backgroundColor: 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: '#94a3b8',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Set up later
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
