'use client'

import { useState } from 'react'
import { FieldError } from '@/components/field-error'
import { errorAlertStyle, inputStyle, labelStyle } from '@/lib/ui/theme'

interface Props {
  parentId: string | null
  type: 'location' | 'folder'
  onClose: () => void
  onSuccess: () => void
}

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
  margin: '0 0 1.5rem',
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

const reviewRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  backgroundColor: '#0f172a',
  borderRadius: '8px',
  padding: '1rem',
  marginBottom: '1.5rem',
}

const reviewLabelStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: '#94a3b8',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
}

const reviewValueStyle: React.CSSProperties = {
  fontSize: '0.875rem',
  color: '#f8fafc',
}

export function LocationSetupModal({ parentId, type, onClose, onSuccess }: Props) {
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const title = type === 'location' ? 'New Location' : 'New Folder'
  const nameLabel = type === 'location' ? 'Location name' : 'Folder name'

  const nameOverLimit = name.length > 80
  const descOverLimit = description.length > 200
  const addressOverLimit = address.length > 200
  const canNext = name.trim().length > 0 && !nameOverLimit && !descOverLimit && !addressOverLimit

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const body: Record<string, unknown> = {
        parentId,
        type,
        name: name.trim(),
      }
      if (type === 'location' && address.trim()) body.address = address.trim()
      if (description.trim()) body.description = description.trim()

      const res = await fetch('/api/dashboard/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!data.ok) {
        setError(data.error ?? 'Something went wrong.')
        return
      }
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div role="dialog" aria-modal="true" style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={modalStyle}>
        <button style={closeBtnStyle} onClick={onClose} aria-label="Close">×</button>

        {step === 1 && (
          <>
            <h2 style={titleStyle}>{title}</h2>
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>
                {nameLabel} *
                <input
                  style={inputStyle}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={120}
                  placeholder={type === 'location' ? 'e.g. Main Branch' : 'e.g. Dentistry'}
                  autoFocus
                />
                {nameOverLimit && <FieldError message="Name must be 80 characters or fewer" />}
              </label>

              {type === 'location' && (
                <label style={labelStyle}>
                  Address
                  <input
                    style={inputStyle}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={250}
                    placeholder="e.g. 123 High St, London"
                  />
                  {addressOverLimit && <FieldError message="Address must be 200 characters or fewer" />}
                </label>
              )}

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
              <button style={ghostBtnStyle} onClick={onClose}>Cancel</button>
              <button
                style={canNext ? primaryBtnStyle : disabledBtnStyle}
                disabled={!canNext}
                onClick={() => setStep(2)}
              >
                Next →
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 style={titleStyle}>Review</h2>
            <div style={reviewRowStyle}>
              <div>
                <div style={reviewLabelStyle}>{nameLabel}</div>
                <div style={reviewValueStyle}>{name}</div>
              </div>
              {type === 'location' && address && (
                <div>
                  <div style={reviewLabelStyle}>Address</div>
                  <div style={reviewValueStyle}>{address}</div>
                </div>
              )}
              {description && (
                <div>
                  <div style={reviewLabelStyle}>Description</div>
                  <div style={reviewValueStyle}>{description}</div>
                </div>
              )}
            </div>

            {error && <div style={{ ...errorAlertStyle, marginBottom: '1rem' }}>{error}</div>}

            <div style={btnRowStyle}>
              <button style={ghostBtnStyle} onClick={() => setStep(1)}>← Back</button>
              <button
                style={submitting ? disabledBtnStyle : primaryBtnStyle}
                disabled={submitting}
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
