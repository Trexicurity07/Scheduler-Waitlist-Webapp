import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { CalendarSetupModal } from '@/components/calendar-setup-modal'

const TYPE_LABELS: Record<string, string> = {
  slot_offer: 'Slot offer',
  owner_added: 'Added by you',
  owner_removed: 'Removed by you',
  expiry: 'Waitlist expiry',
  email_verification: 'Email verification',
}

function StatusBadge({ status }: { status: string }) {
  const classes: Record<string, string> = {
    sent: 'bg-blue-500/15 text-blue-300',
    confirmed: 'bg-green-500/15 text-green-300',
    declined: 'bg-red-500/15 text-red-300',
    expired: 'bg-slate-700/60 text-slate-400',
    superseded: 'bg-slate-700/60 text-slate-400',
  }
  const cls = classes[status] ?? classes.expired
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  )
}

export default async function NotificationsPage() {
  const { supabase, owner, business } = await getCurrentBusiness()

  if (!business) {
    return (
      <main className="max-w-3xl">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-white m-0">Notification history</h1>
          <p className="text-slate-500 text-sm mt-1">{owner.business_name}</p>
        </div>
        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-8 text-center">
          <p className="text-slate-500 text-sm mb-4">
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
    <main className="max-w-3xl">
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-white m-0">Notification history</h1>
        <p className="text-slate-500 text-sm mt-1">{business.name}</p>
      </div>

      {!notifications || notifications.length === 0 ? (
        <p className="text-slate-500">No notifications sent yet.</p>
      ) : (
        <div className="rounded-xl border border-white/[0.08] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.02]">
              <tr className="border-b border-white/[0.08]">
                {['Client', 'Type', 'Status', 'Sent', 'Responded'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {notifications.map((notification, idx) => {
                const clientProfile = (notification.waitlist_entries?.clients as { client_profiles?: { name?: string } } | null)
                  ?.client_profiles
                return (
                  <tr
                    key={notification.id}
                    className={idx < notifications.length - 1 ? 'border-b border-white/[0.06]' : ''}
                  >
                    <td className="px-4 py-3 text-white font-medium">
                      {clientProfile?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {TYPE_LABELS[notification.type] ?? notification.type}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={notification.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(notification.sent_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
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
