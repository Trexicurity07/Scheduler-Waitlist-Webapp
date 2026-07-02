import type { PastEntry } from '@/lib/client-dashboard/manage-own-entries'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  removed: { bg: 'rgba(239,68,68,0.12)', color: '#fca5a5' },
  expired: { bg: 'rgba(100,116,139,0.15)', color: '#94a3b8' },
  confirmed: { bg: 'rgba(34,197,94,0.12)', color: '#86efac' },
}

export default function PastEntriesSection({ entries }: { entries: PastEntry[] }) {
  if (entries.length === 0) {
    return <p style={{ color: '#64748b', fontSize: '0.875rem' }}>No past waitlist history.</p>
  }
  return (
    <div style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {['Business', 'Status', 'Date'].map((h) => (
              <th key={h} style={{
                padding: '0.625rem 1rem', textAlign: 'left' as const,
                fontSize: '0.75rem', fontWeight: 600, color: '#64748b',
                textTransform: 'uppercase' as const, letterSpacing: '0.05em',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => {
            const s = STATUS_COLORS[e.status] ?? STATUS_COLORS.expired
            return (
              <tr key={e.entry_id} style={{
                borderBottom: idx < entries.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}>
                <td style={{ padding: '0.625rem 1rem', color: '#f8fafc' }}>{e.business_name}</td>
                <td style={{ padding: '0.625rem 1rem' }}>
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.5rem',
                    borderRadius: '4px', backgroundColor: s.bg, color: s.color,
                    textTransform: 'capitalize' as const,
                  }}>
                    {e.status}
                  </span>
                </td>
                <td style={{ padding: '0.625rem 1rem', color: '#64748b' }}>
                  {e.expires_at ? new Date(e.expires_at).toLocaleDateString() : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
