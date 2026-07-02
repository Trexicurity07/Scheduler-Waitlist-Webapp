'use client'

import { useEffect, useState } from 'react'
import { FieldError } from '@/components/field-error'
import { errorAlertStyle, inputStyle, labelStyle } from '@/lib/ui/theme'

interface CalendarEntry {
  id: string
  summary?: string
  timezone?: string
}

interface WaitlistData {
  id: string
  name: string
  description: string | null
  calendar_status: 'pending' | 'connected' | 'disconnected'
  dedicated_calendar_id: string | null
  batch_size: number
  batch_interval_minutes: number
  min_notice_hours: number
  min_confirm_lead_hours: number
  timezone: string
}

interface Props {
  nodeId: string
  mode: 'create' | 'edit'
  waitlist?: WaitlistData
  onClose: () => void
  onSuccess: () => void
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 50,
  backgroundColor: 'rgba(0,0,0,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
}

const modalStyle: React.CSSProperties = {
  backgroundColor: '#1e293b',
  borderRadius: '12px',
  padding: '32px',
  width: 'min(90vw, 480px)',
  position: 'relative',
  maxHeight: '90vh',
  overflowY: 'auto',
}

const closeBtnStyle: React.CSSProperties = {
  position: 'absolute',
  top: '16px',
  right: '16px',
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '1.25rem',
  cursor: 'pointer',
  lineHeight: 1,
  padding: '4px',
}

const titleStyle: React.CSSProperties = {
  fontSize: '1.1rem',
  fontWeight: 700,
  color: '#f8fafc',
  margin: '0 0 0.375rem',
}

const stepIndicatorStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#64748b',
  marginBottom: '1.5rem',
}

const fieldGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  marginBottom: '1.5rem',
}

const hintStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#94a3b8',
  marginBottom: '1.5rem',
}

const btnRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  justifyContent: 'flex-end',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '0.625rem 1.25rem',
  backgroundColor: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: '7px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
}

const disabledBtnStyle: React.CSSProperties = {
  ...primaryBtnStyle,
  opacity: 0.45,
  cursor: 'not-allowed',
}

const ghostBtnStyle: React.CSSProperties = {
  padding: '0.625rem 1rem',
  backgroundColor: 'transparent',
  color: '#94a3b8',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '7px',
  fontSize: '0.875rem',
  cursor: 'pointer',
}

const reviewCardStyle: React.CSSProperties = {
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.5rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.625rem',
}

const reviewLabelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: '#94a3b8',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const reviewValueStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#f8fafc',
}

const calendarConnectedBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(34,197,94,0.1)',
  border: '1px solid rgba(34,197,94,0.3)',
  color: '#86efac',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  marginBottom: '1rem',
}

const calendarErrorBoxStyle: React.CSSProperties = {
  backgroundColor: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.25)',
  color: '#fca5a5',
  borderRadius: '8px',
  padding: '0.75rem 1rem',
  fontSize: '0.875rem',
  marginBottom: '1rem',
}

const connectBtnStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '0.625rem 1.25rem',
  backgroundColor: '#3b82f6',
  color: '#fff',
  border: 'none',
  borderRadius: '7px',
  fontWeight: 600,
  fontSize: '0.875rem',
  cursor: 'pointer',
  textDecoration: 'none',
}

const removeLinkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#94a3b8',
  fontSize: '0.8rem',
  cursor: 'pointer',
  textDecoration: 'underline',
  padding: 0,
  marginTop: '0.5rem',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  colorScheme: 'dark',
}

// ── Component ──────────────────────────────────────────────────────────────────

export function WaitlistSetupModal({ nodeId, mode, waitlist, onClose, onSuccess }: Props) {
  const totalSteps = 4

  // Step 1 — Calendar state
  const [calLoading, setCalLoading] = useState(true)
  const [calendars, setCalendars] = useState<CalendarEntry[]>([])
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('')
  // In edit mode, reflect existing connection unless user removes it
  const [calendarRemoved, setCalendarRemoved] = useState(false)

  // Step 2 — Details
  const [name, setName] = useState(mode === 'edit' && waitlist ? waitlist.name : '')
  const [description, setDescription] = useState(
    mode === 'edit' && waitlist && waitlist.description ? waitlist.description : ''
  )

  // Step 3 — Config
  const [batchSize, setBatchSize] = useState(
    mode === 'edit' && waitlist ? String(waitlist.batch_size) : '3'
  )
  const [batchInterval, setBatchInterval] = useState(
    mode === 'edit' && waitlist ? String(waitlist.batch_interval_minutes) : '60'
  )
  const [minNotice, setMinNotice] = useState(
    mode === 'edit' && waitlist ? String(waitlist.min_notice_hours) : '24'
  )
  const [confirmLead, setConfirmLead] = useState(
    mode === 'edit' && waitlist ? String(waitlist.min_confirm_lead_hours) : '2'
  )
  const [timezone, setTimezone] = useState(
    mode === 'edit' && waitlist ? waitlist.timezone : 'UTC'
  )

  // Navigation & submission
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derived calendar state
  const existingConnected =
    mode === 'edit' &&
    waitlist &&
    (waitlist.calendar_status === 'connected' || waitlist.calendar_status === 'pending') &&
    !calendarRemoved

  const pendingCalendarConnected = calendars.length > 0 && selectedCalendarId !== ''

  const isCalendarConnected = existingConnected || pendingCalendarConnected

  // Fetch pending calendar on mount
  useEffect(() => {
    async function fetchPending() {
      try {
        const res = await fetch('/api/dashboard/pending-calendar')
        if (!res.ok) return
        const data = await res.json()
        if (data.ok && Array.isArray(data.calendars) && data.calendars.length > 0) {
          setCalendars(data.calendars as CalendarEntry[])
          setSelectedCalendarId((data.calendars as CalendarEntry[])[0].id)
        }
      } catch {
        // ignore — treat as no pending
      } finally {
        setCalLoading(false)
      }
    }
    fetchPending()
  }, [])

  // Validation helpers
  const nameOverLimit = name.length > 80
  const descOverLimit = description.length > 200
  const confirmLeadNum = parseInt(confirmLead, 10)
  const minNoticeNum = parseInt(minNotice, 10)
  const confirmLeadError =
    !isNaN(confirmLeadNum) && !isNaN(minNoticeNum) && confirmLeadNum >= minNoticeNum
      ? 'Confirm lead time must be less than minimum notice hours'
      : null

  const canSubmit =
    name.trim().length > 0 &&
    !nameOverLimit &&
    !descOverLimit &&
    !confirmLeadError &&
    isCalendarConnected

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'create') {
        const body: Record<string, unknown> = {
          nodeId,
          calendarId: selectedCalendarId,
          name: name.trim(),
        }
        if (description.trim()) body.description = description.trim()
        if (batchSize) body.batchSize = parseInt(batchSize, 10)
        if (batchInterval) body.batchIntervalMinutes = parseInt(batchInterval, 10)
        if (minNotice) body.minNoticeHours = parseInt(minNotice, 10)
        if (confirmLead) body.minConfirmLeadHours = parseInt(confirmLead, 10)
        if (timezone) body.timezone = timezone

        const res = await fetch('/api/dashboard/waitlists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!data.ok) {
          setError(data.error ?? 'Something went wrong.')
          return
        }
      } else {
        // Edit mode — PATCH settings (calendar is managed separately via /calendar sub-route)
        if (!waitlist) return
        const body: Record<string, unknown> = {}
        if (name.trim() !== waitlist.name) body.name = name.trim()
        const trimmedDesc = description.trim()
        if (trimmedDesc !== (waitlist.description ?? '')) body.description = trimmedDesc
        const batchSizeNum = parseInt(batchSize, 10)
        if (batchSizeNum !== waitlist.batch_size) body.batchSize = batchSizeNum
        const batchIntervalNum = parseInt(batchInterval, 10)
        if (batchIntervalNum !== waitlist.batch_interval_minutes) body.batchIntervalMinutes = batchIntervalNum
        if (minNoticeNum !== waitlist.min_notice_hours) body.minNoticeHours = minNoticeNum
        if (confirmLeadNum !== waitlist.min_confirm_lead_hours) body.minConfirmLeadHours = confirmLeadNum
        if (timezone !== waitlist.timezone) body.timezone = timezone

        if (Object.keys(body).length > 0) {
          const res = await fetch(`/api/dashboard/waitlists/${waitlist.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          const data = await res.json()
          if (!data.ok) {
            setError(data.error ?? 'Something went wrong.')
            return
          }
        }

        // If pending calendar was picked, link it
        if (pendingCalendarConnected && !existingConnected) {
          const calRes = await fetch(`/api/dashboard/waitlists/${waitlist.id}/calendar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ calendarId: selectedCalendarId }),
          })
          const calData = await calRes.json()
          if (!calData.ok) {
            setError(calData.error ?? 'Could not link calendar.')
            return
          }
        }
      }
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRemoveCalendar() {
    if (mode === 'edit' && waitlist && existingConnected) {
      try {
        await fetch(`/api/dashboard/waitlists/${waitlist.id}/calendar`, { method: 'DELETE' })
      } catch {
        // best-effort
      }
      setCalendarRemoved(true)
    }
    setCalendars([])
    setSelectedCalendarId('')
  }

  const oauthUrl =
    mode === 'create'
      ? `/api/oauth/google/start?context=new-waitlist&nodeId=${encodeURIComponent(nodeId)}`
      : `/api/oauth/google/start?context=relink&waitlistId=${encodeURIComponent(waitlist?.id ?? '')}`

  const selectedCalendar = calendars.find((c) => c.id === selectedCalendarId)

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={overlayStyle}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">×</button>

        {/* ── Step 1: Link Calendar ─────────────────────────────────────── */}
        {step === 1 && (
          <>
            <h2 style={titleStyle}>Connect Calendar</h2>
            <p style={stepIndicatorStyle}>Step 1 of {totalSteps}</p>

            {calLoading ? (
              <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
                Checking for pending calendar connection…
              </p>
            ) : isCalendarConnected ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={calendarConnectedBoxStyle}>
                  {existingConnected
                    ? `Calendar connected: ${waitlist?.dedicated_calendar_id ?? 'your Google Calendar'}`
                    : `Calendar selected: ${selectedCalendar?.summary ?? selectedCalendarId}`}
                </div>
                {calendars.length > 1 && !existingConnected && (
                  <label style={{ ...labelStyle, marginBottom: '0.75rem' }}>
                    Choose calendar
                    <select
                      style={selectStyle}
                      value={selectedCalendarId}
                      onChange={(e) => setSelectedCalendarId(e.target.value)}
                    >
                      {calendars.map((cal) => (
                        <option key={cal.id} value={cal.id}>
                          {cal.summary ?? cal.id}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <button style={removeLinkStyle} onClick={handleRemoveCalendar}>
                  Remove calendar
                </button>
              </div>
            ) : (
              <div style={{ marginBottom: '1.5rem' }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', marginBottom: '1rem' }}>
                  Link a Google Calendar so SlotFill can monitor it for cancellations and notify
                  your waitlist automatically.
                </p>
                <a href={oauthUrl} style={connectBtnStyle}>
                  Connect Google Calendar
                </a>
              </div>
            )}

            <p style={hintStyle}>* Required fields</p>

            <div style={btnRowStyle}>
              <button style={ghostBtnStyle} onClick={onClose}>Cancel</button>
              <button style={primaryBtnStyle} onClick={() => setStep(2)}>
                Next →
              </button>
            </div>
          </>
        )}

        {/* ── Step 2: Details ───────────────────────────────────────────── */}
        {step === 2 && (
          <>
            <h2 style={titleStyle}>Waitlist Details</h2>
            <p style={stepIndicatorStyle}>Step 2 of {totalSteps}</p>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Waitlist name *
                <input
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder="e.g. Checkups"
                  autoFocus
                />
                {nameOverLimit && <FieldError message="Name must be 80 characters or fewer" />}
              </label>

              <label style={labelStyle}>
                Description
                <textarea
                  style={{ ...inputStyle, resize: 'vertical', minHeight: '72px' }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={250}
                  placeholder="Optional description"
                />
                {descOverLimit && <FieldError message="Description must be 200 characters or fewer" />}
              </label>
            </div>

            <p style={hintStyle}>* Required fields</p>

            <div style={btnRowStyle}>
              <button style={ghostBtnStyle} onClick={() => setStep(1)}>← Back</button>
              <button
                style={name.trim().length > 0 && !nameOverLimit && !descOverLimit ? primaryBtnStyle : disabledBtnStyle}
                disabled={name.trim().length === 0 || nameOverLimit || descOverLimit}
                onClick={() => setStep(3)}
              >
                Next →
              </button>
            </div>
          </>
        )}

        {/* ── Step 3: Configuration ─────────────────────────────────────── */}
        {step === 3 && (
          <>
            <h2 style={titleStyle}>Configuration</h2>
            <p style={stepIndicatorStyle}>Step 3 of {totalSteps}</p>

            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                Batch size
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  value={batchSize}
                  onChange={(e) => setBatchSize(e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  How many clients are notified per opening
                </span>
              </label>

              <label style={labelStyle}>
                Batch interval (minutes)
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  value={batchInterval}
                  onChange={(e) => setBatchInterval(e.target.value)}
                />
              </label>

              <label style={labelStyle}>
                Minimum notice (hours)
                <input
                  style={inputStyle}
                  type="number"
                  min={1}
                  value={minNotice}
                  onChange={(e) => setMinNotice(e.target.value)}
                />
              </label>

              <label style={labelStyle}>
                Confirm lead time (hours)
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  value={confirmLead}
                  onChange={(e) => setConfirmLead(e.target.value)}
                />
                {confirmLeadError && <FieldError message={confirmLeadError} />}
              </label>

              <label style={labelStyle}>
                Timezone
                <input
                  style={inputStyle}
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  placeholder="e.g. Europe/London"
                />
              </label>
            </div>

            <div style={btnRowStyle}>
              <button style={ghostBtnStyle} onClick={() => setStep(2)}>← Back</button>
              <button
                style={confirmLeadError ? disabledBtnStyle : primaryBtnStyle}
                disabled={!!confirmLeadError}
                onClick={() => setStep(4)}
              >
                Next →
              </button>
            </div>
          </>
        )}

        {/* ── Step 4: Review & Submit ───────────────────────────────────── */}
        {step === 4 && (
          <>
            <h2 style={titleStyle}>Review</h2>
            <p style={stepIndicatorStyle}>Step 4 of {totalSteps}</p>

            {/* Calendar status */}
            {isCalendarConnected ? (
              <div style={calendarConnectedBoxStyle}>
                Calendar connected ✓
              </div>
            ) : (
              <div style={calendarErrorBoxStyle}>
                Calendar not connected — you must link a calendar before submitting.
              </div>
            )}

            <div style={reviewCardStyle}>
              <div>
                <div style={reviewLabelStyle}>Waitlist name</div>
                <div style={reviewValueStyle}>{name}</div>
              </div>
              {description && (
                <div>
                  <div style={reviewLabelStyle}>Description</div>
                  <div style={reviewValueStyle}>{description}</div>
                </div>
              )}
              <div>
                <div style={reviewLabelStyle}>Batch size</div>
                <div style={reviewValueStyle}>{batchSize}</div>
              </div>
              <div>
                <div style={reviewLabelStyle}>Batch interval</div>
                <div style={reviewValueStyle}>{batchInterval} min</div>
              </div>
              <div>
                <div style={reviewLabelStyle}>Min notice</div>
                <div style={reviewValueStyle}>{minNotice} hrs</div>
              </div>
              <div>
                <div style={reviewLabelStyle}>Confirm lead time</div>
                <div style={reviewValueStyle}>{confirmLead} hrs</div>
              </div>
              <div>
                <div style={reviewLabelStyle}>Timezone</div>
                <div style={reviewValueStyle}>{timezone}</div>
              </div>
            </div>

            {error && <div style={{ ...errorAlertStyle, marginBottom: '1rem' }}>{error}</div>}

            <div style={btnRowStyle}>
              <button style={ghostBtnStyle} onClick={() => setStep(3)}>← Back</button>
              <button
                style={canSubmit && !submitting ? primaryBtnStyle : disabledBtnStyle}
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              >
                {submitting ? 'Saving…' : 'Submit'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
