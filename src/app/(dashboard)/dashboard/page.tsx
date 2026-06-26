import Link from 'next/link'
import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'

export default async function DashboardPage() {
  const { supabase, business } = await getCurrentBusiness()

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
    <main style={{ maxWidth: '900px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {business.name}
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {business.business_type ?? 'Business'} · SlotFill dashboard
        </p>
      </div>

      {/* Calendar disconnected banner */}
      {calendarDisconnected && (
        <div role="alert" style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}>
          <span style={{ color: '#991b1b', fontSize: '0.875rem' }}>
            Your Google Calendar connection has expired — slot fills are paused.
          </span>
          <Link href="/connect" style={{
            padding: '0.4rem 0.875rem',
            backgroundColor: '#dc2626',
            color: '#fff',
            borderRadius: '6px',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
            whiteSpace: 'nowrap',
          }}>
            Reconnect
          </Link>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        <StatCard label="Active waitlist" value={waitlistEntries?.length ?? 0} href="/waitlist" accent="#3b82f6" />
        <StatCard label="Upcoming appointments" value={appointments?.length ?? 0} accent="#10b981" />
        <StatCard label="Notifications sent" value={notifications?.length ?? 0} href="/notifications" accent="#8b5cf6" />
      </div>

      {/* Main grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* Waitlist preview */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
            <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>
              Waitlist ({waitlistEntries?.length ?? 0})
            </h2>
            <Link href="/waitlist" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none' }}>
              {waitlistEntries?.length === 0 ? 'Add first client' : 'Manage →'}
            </Link>
          </div>
          {!waitlistEntries || waitlistEntries.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
              No one on the waitlist yet. Add a client to get started.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {waitlistEntries.map((entry) => {
                const profile = (entry.clients as { client_profiles?: { name?: string; email?: string } } | null)?.client_profiles
                return (
                  <li key={entry.id} style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9',
                  }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      backgroundColor: '#dbeafe', color: '#1d4ed8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                    }}>
                      {(profile?.name ?? '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>
                        {profile?.name ?? '—'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {profile?.email ?? '—'}
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Upcoming appointments */}
        <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: '0 0 0.875rem' }}>
            Upcoming appointments ({appointments?.length ?? 0})
          </h2>
          {!appointments || appointments.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>No upcoming appointments.</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {appointments.map((appt) => (
                <li key={appt.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a' }}>
                    {appt.summary ?? 'Appointment'}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
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

      {/* Recent notifications */}
      <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: 0 }}>Recent notifications</h2>
          <Link href="/notifications" style={{ fontSize: '0.75rem', color: '#3b82f6', textDecoration: 'none' }}>
            View all →
          </Link>
        </div>
        {!notifications || notifications.length === 0 ? (
          <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>No notifications sent yet.</p>
        ) : (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0' }}>
            {notifications.map((n) => {
              const profile = (n.waitlist_entries as { clients?: { client_profiles?: { name?: string } } } | null)
                ?.clients?.client_profiles
              return (
                <li key={n.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.625rem 0', borderBottom: '1px solid #f1f5f9', gap: '1rem',
                }}>
                  <div>
                    <span style={{ fontSize: '0.875rem', color: '#0f172a' }}>{profile?.name ?? '—'}</span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '0.5rem' }}>
                      {n.type === 'slot_offer' ? 'slot offer' : n.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <StatusBadge status={n.status} />
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(n.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Quick links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
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

function StatCard({ label, value, href, accent }: { label: string; value: number; href?: string; accent: string }) {
  const inner = (
    <div style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1.25rem' }}>
      <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.07em', marginBottom: '0.375rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 700, color: accent, lineHeight: 1 }}>{value}</div>
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    sent: { bg: '#eff6ff', color: '#1d4ed8' },
    confirmed: { bg: '#f0fdf4', color: '#15803d' },
    declined: { bg: '#fef2f2', color: '#b91c1c' },
    expired: { bg: '#f8fafc', color: '#475569' },
  }
  const s = map[status] ?? { bg: '#f8fafc', color: '#475569' }
  return (
    <span style={{
      fontSize: '0.7rem', fontWeight: 600, padding: '0.2rem 0.5rem',
      borderRadius: '4px', backgroundColor: s.bg, color: s.color, textTransform: 'capitalize' as const,
    }}>
      {status}
    </span>
  )
}

function QuickLink({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} style={{
      display: 'block', backgroundColor: '#fff', border: '1px solid #e2e8f0',
      borderRadius: '10px', padding: '1.25rem', textDecoration: 'none',
    }}>
      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', marginBottom: '0.375rem' }}>
        {title} →
      </div>
      <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>{description}</div>
    </Link>
  )
}
