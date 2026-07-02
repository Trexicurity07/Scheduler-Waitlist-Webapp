'use client'

import { useRouter } from 'next/navigation'
import { AddEntryForm } from '../add-entry-form'
import { SettingsForm } from '../settings-form'
import { RemoveEntryButton } from '../remove-entry-button'

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#0f172a',
  surface: '#1e293b',
  text: '#f8fafc',
  textMuted: '#94a3b8',
  accent: '#3b82f6',
  border: '#334155',
  error: '#ef4444',
  warning: 'rgba(234,179,8,0.15)',
  warningBorder: 'rgba(234,179,8,0.35)',
  warningText: '#fde047',
  connected: '#22c55e',
  disconnected: '#ef4444',
  pending: '#f59e0b',
} as const

interface WaitlistRow {
  id: string
  name: string
  calendar_status: string
  node_id: string
  batch_size: number
  batch_interval_minutes: number
  min_notice_hours: number
  min_confirm_lead_hours: number
  timezone: string
  [key: string]: unknown
}

interface Entry {
  id: string
  clientId: string | null
  name: string
  email: string
}

interface Props {
  waitlist: WaitlistRow
  entries: Entry[]
  breadcrumb: string[]
  defaultSettingsOpen: boolean
}

export function WaitlistDetailView({ waitlist, entries, breadcrumb, defaultSettingsOpen }: Props) {
  const router = useRouter()
  const calendarConnected = waitlist.calendar_status === 'connected'

  const statusColor =
    waitlist.calendar_status === 'connected'
      ? C.connected
      : waitlist.calendar_status === 'disconnected'
        ? C.disconnected
        : C.pending

  return (
    <div style={{ padding: '1.5rem 2rem', maxWidth: '1100px', backgroundColor: C.bg, minHeight: '100vh' }}>
      {/* Back link */}
      <button
        onClick={() => router.push('/waitlist')}
        style={{
          background: 'none',
          border: 'none',
          color: C.textMuted,
          fontSize: '0.8rem',
          cursor: 'pointer',
          padding: 0,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.375rem',
        }}
      >
        ← Back to Waitlists
      </button>

      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.text, margin: 0 }}>{waitlist.name}</h1>
          <span style={{ color: statusColor, fontSize: '0.65rem', lineHeight: 1 }}>●</span>
          <span style={{ fontSize: '0.8rem', color: statusColor, fontWeight: 500 }}>
            {waitlist.calendar_status === 'connected'
              ? 'connected'
              : waitlist.calendar_status === 'disconnected'
                ? 'disconnected'
                : 'pending'}
          </span>
        </div>
        {breadcrumb.length > 0 && (
          <p style={{ fontSize: '0.8rem', color: C.textMuted, margin: 0 }}>{breadcrumb.join(' › ')}</p>
        )}
      </div>

      {/* Calendar disconnected banner */}
      {!calendarConnected && (
        <div
          style={{
            backgroundColor: C.warning,
            border: `1px solid ${C.warningBorder}`,
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            fontSize: '0.875rem',
            color: C.warningText,
          }}
        >
          <span>⚠ Calendar not connected.</span>
          <a
            href={`/api/oauth/google/start?context=relink&waitlistId=${waitlist.id}`}
            style={{ color: C.accent, textDecoration: 'underline', fontWeight: 500 }}
          >
            Connect Calendar
          </a>
        </div>
      )}

      {/* 2-column grid: entries list + add form */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1.2fr) minmax(0,1fr)',
          gap: '1.25rem',
          marginBottom: '1.5rem',
          alignItems: 'start',
        }}
      >
        {/* Active entries */}
        <div
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: C.text, margin: '0 0 1rem' }}>
            Active waitlist ({entries.length})
          </h2>
          {entries.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: C.textMuted, margin: 0 }}>No active entries yet.</p>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    padding: '0.625rem 0.75rem',
                    backgroundColor: C.bg,
                    borderRadius: '7px',
                    border: `1px solid rgba(255,255,255,0.06)`,
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {entry.name}
                    </div>
                    {entry.email && (
                      <div style={{ fontSize: '0.75rem', color: C.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.email}
                      </div>
                    )}
                  </div>
                  <RemoveEntryButton entryId={entry.id} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add client form */}
        <div
          style={{
            backgroundColor: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '1.25rem',
          }}
        >
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: C.text, margin: '0 0 1rem' }}>Add client</h2>
          <AddEntryForm waitlistId={waitlist.id} />
        </div>
      </div>

      {/* Settings */}
      <div
        style={{
          backgroundColor: C.surface,
          border: `1px solid ${C.border}`,
          borderRadius: '10px',
          padding: '1.25rem',
        }}
      >
        <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: C.text, margin: '0 0 1rem' }}>Settings</h2>
        <SettingsForm
          waitlistId={waitlist.id}
          waitlist={{
            batch_size: waitlist.batch_size,
            batch_interval_minutes: waitlist.batch_interval_minutes,
            min_notice_hours: waitlist.min_notice_hours,
            min_confirm_lead_hours: waitlist.min_confirm_lead_hours,
            timezone: waitlist.timezone,
          }}
        />
      </div>
    </div>
  )
}
