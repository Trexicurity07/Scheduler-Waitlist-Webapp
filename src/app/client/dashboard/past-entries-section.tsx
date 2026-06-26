import type { PastEntry } from '@/lib/client-dashboard/manage-own-entries'

export default function PastEntriesSection({ entries }: { entries: PastEntry[] }) {
  if (entries.length === 0) return <p>No past waitlist history.</p>
  return (
    <table>
      <thead>
        <tr>
          <th>Business</th>
          <th>Status</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.entry_id}>
            <td>{e.business_name}</td>
            <td style={{ textTransform: 'capitalize' }}>{e.status}</td>
            <td>{e.expires_at ? new Date(e.expires_at).toLocaleDateString() : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
