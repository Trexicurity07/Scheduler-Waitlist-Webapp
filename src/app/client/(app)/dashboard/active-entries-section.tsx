'use client'

import { useState } from 'react'
import type { ActiveEntry, TimeWindow } from '@/lib/client-dashboard/manage-own-entries'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function ActiveEntriesSection({ entries }: { entries: ActiveEntry[] }) {
  const [localEntries, setLocalEntries] = useState(entries)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editWindows, setEditWindows] = useState<TimeWindow[]>([])
  const [error, setError] = useState<string | null>(null)

  if (localEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 text-sm">You are not on any waitlists.</p>
        <a
          href="/browse"
          className="text-sm text-sky-400 hover:text-sky-300 transition-colors mt-2 inline-block"
        >
          Browse businesses →
        </a>
      </div>
    )
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
    <div className="space-y-3">
      {error && (
        <div
          role="alert"
          className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400"
        >
          {error}
        </div>
      )}
      {localEntries.map((entry) => (
        <div
          key={entry.entry_id}
          className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-4"
        >
          <div className="mb-3">
            <span className="text-sm font-semibold text-white">{entry.business_name}</span>
            {entry.business_type && (
              <span className="text-xs text-slate-500 ml-2">· {entry.business_type}</span>
            )}
            {entry.whatsapp_number && (
              <span className="text-xs text-slate-500 ml-2">
                ·{' '}
                <a
                  href={`https://wa.me/${entry.whatsapp_number}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sky-400 hover:text-sky-300 transition-colors"
                >
                  WhatsApp
                </a>
              </span>
            )}
          </div>
          {entry.expires_at && (
            <p className="text-xs text-slate-500 mb-3">
              Expires {new Date(entry.expires_at).toLocaleDateString()}
            </p>
          )}

          {editingId === entry.entry_id ? (
            <div className="space-y-2">
              {editWindows.map((w, i) => (
                <div key={i} className="flex items-center gap-2 flex-wrap">
                  {DAYS.map((label, day) => (
                    <label
                      key={day}
                      className={cn(
                        'flex items-center gap-1 cursor-pointer text-xs px-2 py-1 rounded-lg border transition-colors',
                        w.days.includes(day)
                          ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                          : 'border-white/[0.08] text-slate-400 hover:border-white/20'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={w.days.includes(day)}
                        className="sr-only"
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
                    className="px-2 py-1 rounded-lg border border-white/[0.12] text-xs bg-[#0f172a] text-white [color-scheme:dark]"
                    onChange={(e) =>
                      setEditWindows((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, start: e.target.value } : x))
                      )
                    }
                  />
                  <span className="text-slate-500 text-xs">–</span>
                  <input
                    type="time"
                    value={w.end}
                    className="px-2 py-1 rounded-lg border border-white/[0.12] text-xs bg-[#0f172a] text-white [color-scheme:dark]"
                    onChange={(e) =>
                      setEditWindows((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, end: e.target.value } : x))
                      )
                    }
                  />
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => handleEditSave(entry.entry_id)}>Save</Button>
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => { setEditingId(entry.entry_id); setEditWindows(entry.time_windows) }}
              >
                Edit times
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCancel(entry.entry_id)}
                className="text-red-400 border-red-500/30 hover:bg-red-500/10 hover:border-red-500/50"
              >
                Leave waitlist
              </Button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
