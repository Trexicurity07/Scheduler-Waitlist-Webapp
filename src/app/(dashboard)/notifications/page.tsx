import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'

const TYPE_LABELS: Record<string, string> = {
  slot_offer: 'Slot offer',
  owner_added: 'Added by you',
  owner_removed: 'Removed by you',
  expiry: 'Waitlist expiry',
  email_verification: 'Email verification',
}

const STATUS_LABELS: Record<string, string> = {
  sent: 'Sent',
  confirmed: 'Confirmed',
  declined: 'Declined',
  expired: 'Expired',
  superseded: 'Superseded',
}

export default async function NotificationsPage() {
  const { supabase, business } = await getCurrentBusiness()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, status, sent_at, responded_at, waitlist_entries!inner(business_id, clients(client_profiles(name, email)))')
    .eq('waitlist_entries.business_id', business.id)
    .order('sent_at', { ascending: false })
    .limit(50)

  return (
    <main>
      <h1>Notification history — {business.name}</h1>
      {!notifications || notifications.length === 0 ? (
        <p>No notifications sent yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Client</th>
              <th>Type</th>
              <th>Status</th>
              <th>Sent</th>
              <th>Responded</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map((notification) => (
              <tr key={notification.id}>
                <td>
                  {(notification.waitlist_entries?.clients as { client_profiles?: { name?: string } } | null)
                    ?.client_profiles?.name ?? '—'}
                </td>
                <td>{TYPE_LABELS[notification.type] ?? notification.type}</td>
                <td>{STATUS_LABELS[notification.status] ?? notification.status}</td>
                <td>{new Date(notification.sent_at).toLocaleString()}</td>
                <td>{notification.responded_at ? new Date(notification.responded_at).toLocaleString() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  )
}
