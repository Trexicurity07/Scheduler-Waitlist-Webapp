'use client'

import { useState } from 'react'
import type { ActiveEntry, TimeWindow } from '@/lib/client-dashboard/manage-own-entries'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const timeInputStyle = {
  padding: '0.375rem 0.5rem',
  borderRadius: '5px',
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: '0.8rem',
  backgroundColor: '#0f172a',
  color: '#f8fafc',
  colorScheme: 'dark' as const,
}

export default function ActiveEntriesSection({ entries }: { entries: ActiveEntry[] }) {
  const [localEntries, setLocalEntries] = useState(entries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWindows, setEditWindows] = useState<TimeWindow[]>([])
  const [error, setError] = useState<string | null>(null)

  if (localEntries.length === 0) {
    return <p style={{ color: '#64748b', fontSize: '0.875rem' }}>You are not on any waitlists.</p>
  }

  async function handleCancel(entryId: string) {
    if (!confirm('Are you sure you want to cancel this waitlist entry?')) return
    const res = await fetch(`/api/client/entries/${entryId}`, { method: 'DELETE' })
    if (res.ok) {
      setLocalEntries((prev) => prev.filter((e) => e.entry_id !== entryId))
    } else {
      const data: unknown = await res.json()
      setError((data as { error?: string }).error ?? 'Could not cancel entry.')
    }
  }

  async function handleEditSave(entryId: string) {
    const res = await fetch(`/api/client/entries/${entryId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ time_windows: editWindows }),
    })
    if (res.ok) {
      setLocalEntries((prev) =>
        prev.map((e) => (e.entry_id === entryId ? { ...e, time_windows: editWindows } : e))
      )
      setEditingId(null)
    } else {
      const data: unknown = await res.json()
      setError((data as { error?: string }).error ?? 'Could not save changes.')
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
      {localEntries.map((entry) => (
        <div key={entry.entry_id} style={{
          backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', padding: '1rem 1.25rem',
        }}>
          <div style={{ marginBottom: '0.625rem' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc' }}>
              {entry.business_name}
            </span>
            {entry.business_type && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                · {entry.business_type}
              </span>
            )}
            {entry.whatsapp_number && (
              <span style={{ fontSize: '0.8rem', color: '#64748b', marginLeft: '0.5rem' }}>
                ·{' '}
                <a
                  href={`https://wa.me/${entry.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: '#0ea5e9', textDecoration: 'none' }}
                >
                  WhatsApp
                </a>
              </span>
            )}
          </div>
          {entry.expires_at && (
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem' }}>
              Expires {new Date(entry.expires_at).toLocaleDateString()}
            </p>
          )}

          {editingId === entry.entry_id ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {editWindows.map((w, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {DAYS.map((label, day) => (
                    <label key={day} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={w.days.includes(day)}
                        style={{ accentColor: '#0ea5e9' }}
                        onChange={() =>
                          setEditWindows((prev) =>
                            prev.map((x, j) =>
                              j !== i
                                ? x
                                : {
                                    ...x,
                                    days: x.days.includes(day)
                                      ? x.days.filter((d) => d !== day)
                                      : [...x.days, day].sort(),
                                  }
                            )
                          )
                        }
                      />
                      {label}
                    </label>
                  ))}
                  <input
                    type="time"
                    value={w.start}
                    style={timeInputStyle}
                    onChange={(e) =>
                      setEditWindows((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, start: e.target.value } : x))
                      )
                    }
                  />
                  <span style={{ color: '#64748b', fontSize: '0.8rem' }}>–</span>
                  <input
                    type="time"
                    value={w.end}
                    style={timeInputStyle}
                    onChange={(e) =>
                      setEditWindows((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, end: e.target.value } : x))
                      )
                    }
                  />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  onClick={() => handleEditSave(entry.entry_id)}
                  style={{
                    padding: '0.4rem 0.875rem', backgroundColor: '#0ea5e9', color: '#fff',
                    border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  style={{
                    padding: '0.4rem 0.875rem', backgroundColor: 'transparent', color: '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => { setEditingId(entry.entry_id); setEditWindows(entry.time_windows) }}
                style={{
                  padding: '0.4rem 0.875rem', backgroundColor: 'transparent', color: '#94a3b8',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Edit times
              </button>
              <button
                onClick={() => handleCancel(entry.entry_id)}
                style={{
                  padding: '0.4rem 0.875rem', backgroundColor: 'transparent', color: '#f87171',
                  border: '1px solid rgba(239,68,68,0.3)', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer',
                }}
              >
                Leave waitlist
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
