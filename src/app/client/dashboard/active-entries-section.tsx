'use client'

import { useState } from 'react'
import type { ActiveEntry, TimeWindow } from '@/lib/client-dashboard/manage-own-entries'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ActiveEntriesSection({ entries }: { entries: ActiveEntry[] }) {
  const [localEntries, setLocalEntries] = useState(entries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWindows, setEditWindows] = useState<TimeWindow[]>([])
  const [error, setError] = useState<string | null>(null)

  if (localEntries.length === 0) return <p>You are not on any waitlists.</p>

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
    <div>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {localEntries.map((entry) => (
        <div
          key={entry.entry_id}
          style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}
        >
          <strong>{entry.business_name}</strong>
          {entry.business_type && <span> · {entry.business_type}</span>}
          {entry.whatsapp_number && (
            <span>
              {' '}
              ·{' '}
              <a href={`https://wa.me/${entry.whatsapp_number}`} target="_blank" rel="noreferrer">
                Contact on WhatsApp
              </a>
            </span>
          )}
          <p>Expires: {entry.expires_at ? new Date(entry.expires_at).toLocaleDateString() : 'N/A'}</p>

          {editingId === entry.entry_id ? (
            <div>
              {editWindows.map((w, i) => (
                <div key={i} style={{ marginBottom: '0.5rem' }}>
                  {DAYS.map((label, day) => (
                    <label key={day} style={{ marginRight: '0.5rem' }}>
                      <input
                        type="checkbox"
                        checked={w.days.includes(day)}
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
                    onChange={(e) =>
                      setEditWindows((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, start: e.target.value } : x))
                      )
                    }
                  />
                  <span> – </span>
                  <input
                    type="time"
                    value={w.end}
                    onChange={(e) =>
                      setEditWindows((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, end: e.target.value } : x))
                      )
                    }
                  />
                </div>
              ))}
              <button onClick={() => handleEditSave(entry.entry_id)}>Save</button>
              <button onClick={() => setEditingId(null)} style={{ marginLeft: '0.5rem' }}>
                Cancel edit
              </button>
            </div>
          ) : (
            <div>
              <button
                onClick={() => {
                  setEditingId(entry.entry_id)
                  setEditWindows(entry.time_windows)
                }}
              >
                Edit time windows
              </button>
              <button onClick={() => handleCancel(entry.entry_id)} style={{ marginLeft: '0.5rem' }}>
                Cancel waitlist
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
