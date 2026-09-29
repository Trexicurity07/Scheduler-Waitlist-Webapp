import type { PastEntry } from '@/lib/client-dashboard/manage-own-entries'
import { Badge } from '@/components/ui/badge'

function statusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  if (status === 'confirmed') return 'default'
  if (status === 'removed') return 'destructive'
  return 'outline'
}

export default function PastEntriesSection({ entries }: { entries: PastEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-slate-500 text-sm py-8 text-center">No past waitlist history.</p>
  }
  return (
    <div className="rounded-xl border border-white/[0.08] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-white/[0.02]">
          <tr className="border-b border-white/[0.08]">
            {['Business', 'Status', 'Date'].map((h) => (
              <th
                key={h}
                className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => (
            <tr
              key={e.entry_id}
              className={idx < entries.length - 1 ? 'border-b border-white/[0.06]' : ''}
            >
              <td className="px-4 py-3 text-white">{e.business_name}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(e.status)} className="capitalize">
                  {e.status}
                </Badge>
              </td>
              <td className="px-4 py-3 text-slate-500 text-xs">
                {e.expires_at ? new Date(e.expires_at).toLocaleDateString() : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
