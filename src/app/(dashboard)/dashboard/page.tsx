import Link from 'next/link'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { CalendarSetupModal } from '@/components/calendar-setup-modal'

export default async function DashboardPage() {
  const { supabase, owner, business } = await getCurrentBusiness()

  if (!business) {
    return (
      <main className="max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            {owner.business_name}
          </h1>
          <p className="text-slate-500 text-sm mt-1">Business portal · SlotFill</p>
        </div>

        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.06] backdrop-blur-sm p-8 max-w-lg mb-7">
          <h2 className="text-base font-semibold text-white mb-2">
            One more step — connect your calendar
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed mb-4">
            SlotFill monitors your Google Calendar for cancellations and automatically fills
            empty slots from your waitlist.
          </p>
          <ul className="mb-6 pl-4 flex flex-col gap-1.5 list-disc">
            {[
              'Detects cancellations automatically',
              'Notifies your waitlist by WhatsApp or email',
              'Manages bookings without extra work',
            ].map((item) => (
              <li key={item} className="text-sm text-slate-300">{item}</li>
            ))}
          </ul>
          <CalendarSetupModal triggerLabel="Connect Google Calendar" />
        </div>

        <div className="grid grid-cols-3 gap-4 opacity-30 pointer-events-none">
          {['Active waitlist', 'Upcoming appointments', 'Notifications sent'].map((label) => (
            <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-5">
              <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-1.5">{label}</div>
              <div className="text-3xl font-bold text-slate-600 leading-none">—</div>
            </div>
          ))}
        </div>
      </main>
    )
  }

  const [
    { data: waitlistEntries },
    { data: appointments },
    { data: notifications },
  ] = await Promise.all([
    supabase
      .from('waitlist_entries')
      .select('id, clients(client_profiles(name, email))')
      .eq('business_id', business.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
      .limit(5),
    supabase
      .from('appointments')
      .select('id, summary, start_time, end_time')
      .eq('business_id', business.id)
      .eq('status', 'confirmed')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(5),
    supabase
      .from('notifications')
      .select('id, type, status, sent_at, waitlist_entries!inner(business_id, clients(client_profiles(name)))')
      .eq('waitlist_entries.business_id', business.id)
      .order('sent_at', { ascending: false })
      .limit(4),
  ])

  const calendarDisconnected = business.calendar_status === 'disconnected'

  return (
    <main className="max-w-3xl">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
          {business.name}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {business.business_type ?? 'Business'} · SlotFill dashboard
        </p>
      </div>

      {calendarDisconnected && (
        <div
          role="alert"
          className="flex items-center justify-between gap-4 px-4 py-3 mb-6 rounded-xl bg-red-500/10 border border-red-500/20"
        >
          <span className="text-red-300 text-sm">
            Your Google Calendar connection has expired — slot fills are paused.
          </span>
          <Link
            href="/connect"
            className="px-3.5 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold whitespace-nowrap hover:bg-red-500 transition-colors"
          >
            Reconnect
          </Link>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-7">
        <StatCard label="Active waitlist"         value={waitlistEntries?.length ?? 0} href="/waitlist"       accentClass="text-blue-400" />
        <StatCard label="Upcoming appointments"   value={appointments?.length ?? 0}                           accentClass="text-emerald-400" />
        <StatCard label="Notifications sent"      value={notifications?.length ?? 0}  href="/notifications"  accentClass="text-violet-400" />
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white">
              Waitlist ({waitlistEntries?.length ?? 0})
            </h2>
            <Link href="/waitlist" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              {waitlistEntries?.length === 0 ? 'Add first client' : 'Manage →'}
            </Link>
          </div>
          {!waitlistEntries || waitlistEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No one on the waitlist yet.</p>
          ) : (
            <ul className="flex flex-col">
              {waitlistEntries.map((entry) => {
                const profile = (entry.clients as { client_profiles?: { name?: string; email?: string } } | null)?.client_profiles
                return (
                  <li key={entry.id} className="flex items-center gap-2.5 py-2.5 border-b border-white/[0.05] last:border-0">
                    <div className="w-7 h-7 rounded-full bg-blue-500/15 text-blue-300 flex items-center justify-center text-[11px] font-bold shrink-0">
                      {(profile?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-white truncate">{profile?.name ?? '—'}</div>
                      <div className="text-xs text-slate-500 truncate">{profile?.email ?? '—'}</div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5">
          <h2 className="text-sm font-semibold text-white mb-4">
            Upcoming appointments ({appointments?.length ?? 0})
          </h2>
          {!appointments || appointments.length === 0 ? (
            <p className="text-sm text-slate-500">No upcoming appointments.</p>
          ) : (
            <ul className="flex flex-col">
              {appointments.map((appt) => (
                <li key={appt.id} className="py-2.5 border-b border-white/[0.05] last:border-0">
                  <div className="text-sm font-medium text-white">{appt.summary ?? 'Appointment'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {new Date(appt.start_time).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                    })}{' '}
                    {new Date(appt.start_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                    {' – '}
                    {new Date(appt.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Recent notifications</h2>
          <Link href="/notifications" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
            View all →
          </Link>
        </div>
        {!notifications || notifications.length === 0 ? (
          <p className="text-sm text-slate-500">No notifications sent yet.</p>
        ) : (
          <ul className="flex flex-col">
            {notifications.map((n) => {
              const profile = (n.waitlist_entries as { clients?: { client_profiles?: { name?: string } } } | null)
                ?.clients?.client_profiles
              return (
                <li key={n.id} className="flex items-center justify-between py-2.5 border-b border-white/[0.05] last:border-0 gap-4">
                  <div>
                    <span className="text-sm text-white">{profile?.name ?? '—'}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {n.type === 'slot_offer' ? 'slot offer' : n.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={n.status} />
                    <span className="text-xs text-slate-500 whitespace-nowrap">
                      {new Date(n.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <QuickLink
          href="/waitlist"
          title="Manage waitlist"
          description="Add or remove clients, configure batch settings and notice periods."
        />
        <QuickLink
          href="/notifications"
          title="Notification history"
          description="See all slot offers sent and whether they were accepted or declined."
        />
      </div>
    </main>
  )
}

function StatCard({ label, value, href, accentClass }: { label: string; value: number; href?: string; accentClass: string }) {
  const inner = (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5">
      <div className="text-[11px] text-slate-500 uppercase tracking-widest mb-2">{label}</div>
      <div className={`text-3xl font-bold leading-none ${accentClass}`}>{value}</div>
    </div>
  )
  return href ? (
    <Link href={href} className="no-underline block hover:opacity-80 transition-opacity">{inner}</Link>
  ) : inner
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    sent:       'bg-blue-500/15 text-blue-300',
    confirmed:  'bg-green-500/15 text-green-300',
    declined:   'bg-red-500/15 text-red-300',
    expired:    'bg-slate-700/60 text-slate-400',
  }
  const cls = classes[status] ?? classes.expired
  return (
    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md capitalize ${cls}`}>
      {status}
    </span>
  )
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm p-5 no-underline hover:border-white/[0.14] hover:bg-white/[0.05] transition-all"
    >
      <div className="text-sm font-semibold text-white mb-1.5">{title} →</div>
      <div className="text-xs text-slate-500 leading-relaxed">{description}</div>
    </Link>
  )
}
