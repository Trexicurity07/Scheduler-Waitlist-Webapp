import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { CalendarSetupModal } from '@/components/calendar-setup-modal'

const TYPE_LABELS: Record<string, string> = {
  slot_offer: 'Slot offer',
  owner_added: 'Added by you',
  owner_removed: 'Removed by you',
  expiry: 'Waitlist expiry',
  email_verification: 'Email verification',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  sent: { bg: 'rgba(59,130,246,0.15)', color: '#93c5fd' },
  confirmed: { bg: 'rgba(34,197,94,0.15)', color: '#86efac' },
  declined: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5' },
  expired: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  superseded: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
}

export default async function NotificationsPage() {
  const { supabase, owner, business } = await getCurrentBusiness()

  if (!business) {
    return (
      <main style={{ maxWidth: '860px' }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>Notification history</h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>{owner.business_name}</p>
        </div>
        <div style={{
          backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '10px', padding: '2rem', textAlign: 'center' as const,
        }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem' }}>
            Connect your Google Calendar to start receiving slot fill notifications.
          </p>
          <CalendarSetupModal defaultOpen={true} triggerLabel="Connect Google Calendar" />
        </div>
      </main>
    )
  }

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, status, sent_at, responded_at, waitlist_entries!inner(business_id, clients(client_profiles(name, email)))')
    .eq('waitlist_entries.business_id', business.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  return (
    <main style={{ maxWidth: '860px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
          Notification history
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {business.name}
        </p>
      </div>

      {!notifications || notifications.length === 0 ? (
        <p style={{ color: '#64748b' }}>No notifications sent yet.</p>
      ) : (
        <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                {['Client', 'Type', 'Status', 'Sent', 'Responded'].map((h) => (
                  <th key={h} style={{
                    padding: '0.75rem 1rem', textAlign: 'left' as const,
                    fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
                    textTransform: 'uppercase' as const, letterSpacing: '0.05em',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification, idx) => {
                const clientProfile = (notification.waitlist_entries?.clients as { client_profiles?: { name?: string } } | null)
                  ?.client_profiles
                const s = STATUS_COLORS[notification.status] ?? STATUS_COLORS.expired
                return (
                  <tr key={notification.id} style={{
                    borderBottom: idx < notifications.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  }}>
                    <td style={{ padding: '0.75rem 1rem', color: '#f8fafc', fontWeight: 500 }}>
                      {clientProfile?.name ?? '—'}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#94a3b8' }}>
                      {TYPE_LABELS[notification.type] ?? notification.type}
                    </td>
                    <td style={{ padding: '0.75rem 1rem' }}>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem',
                        borderRadius: '4px', backgroundColor: s.bg, color: s.color,
                        textTransform: 'capitalize' as const,
                      }}>
                        {notification.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', whiteSpace: 'nowrap' as const }}>
                      {new Date(notification.sent_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', whiteSpace: 'nowrap' as const }}>
                      {notification.responded_at ? new Date(notification.responded_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}
