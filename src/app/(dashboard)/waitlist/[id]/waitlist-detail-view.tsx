'use client'

import { useRouter } from 'next/navigation'
import { AddEntryForm } from '../add-entry-form'
import { SettingsForm } from '../settings-form'
import { RemoveEntryButton } from '../remove-entry-button'

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

function statusColor(s: string) {
  if (s === 'connected') return 'text-green-400'
  if (s === 'disconnected') return 'text-red-400'
  return 'text-amber-400'
}

export function WaitlistDetailView({ waitlist, entries, breadcrumb, defaultSettingsOpen: _defaultSettingsOpen }: Props) {
  const router = useRouter()
  const calendarConnected = waitlist.calendar_status === 'connected'
  const statusLabel =
    waitlist.calendar_status === 'connected'
      ? 'connected'
      : waitlist.calendar_status === 'disconnected'
        ? 'disconnected'
        : 'pending'

  return (
    <div className="max-w-5xl">
      <button
        onClick={() => router.push('/waitlist')}
        className="flex items-center gap-1.5 text-slate-500 text-xs mb-5 hover:text-slate-300 transition-colors bg-transparent border-none cursor-pointer p-0"
      >
        ← Back to Waitlists
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            {waitlist.name}
          </h1>
          <span className={`text-[10px] ${statusColor(waitlist.calendar_status)}`}>●</span>
          <span className={`text-xs font-medium ${statusColor(waitlist.calendar_status)}`}>
            {statusLabel}
          </span>
        </div>
        {breadcrumb.length > 0 && (
          <p className="text-xs text-slate-500">{breadcrumb.join(' › ')}</p>
        )}
      </div>

      {!calendarConnected && (
        <div className="flex items-center gap-3 px-4 py-3 mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
          <span>⚠ Calendar not connected.</span>
          <a
            href={`/api/oauth/google/start?context=relink&waitlistId=${waitlist.id}`}
            className="text-blue-400 underline font-medium"
          >
            Connect Calendar
          </a>
        </div>
      )}

      <div className="grid grid-cols-[1.2fr_1fr] gap-5 mb-5 items-start">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            Active waitlist ({entries.length})
          </h2>
          {entries.length === 0 ? (
            <p className="text-sm text-slate-500">No active entries yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02]"
                >
                  <div className="min-w-0">
                    <div className="text-sm text-white font-medium truncate">{entry.name}</div>
                    {entry.email && (
                      <div className="text-xs text-slate-500 truncate">{entry.email}</div>
                    )}
                  </div>
                  <RemoveEntryButton entryId={entry.id} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5">
          <h2 className="text-sm font-semibold text-white mb-4">Add client</h2>
          <AddEntryForm waitlistId={waitlist.id} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Settings</h2>
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
