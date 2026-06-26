import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'
import { AddEntryForm } from './add-entry-form'
import { SettingsForm } from './settings-form'
import { RemoveEntryButton } from './remove-entry-button'

export default async function WaitlistPage() {
  const { supabase, business } = await getCurrentBusiness()

  const { data: entries } = await supabase
    .from('waitlist_entries')
    .select('id, clients(client_profiles(name, email, phone))')
    .eq('business_id', business.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  return (
    <main style={{ maxWidth: '860px' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>Waitlist</h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '0.25rem' }}>
          {business.name} · {entries?.length ?? 0} active{' '}
          {(entries?.length ?? 0) === 1 ? 'entry' : 'entries'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Active entries */}
        <div style={{
          backgroundColor: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '10px', padding: '1.25rem',
        }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            Active waitlist ({entries?.length ?? 0})
          </h2>
          {!entries || entries.length === 0 ? (
            <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: 0 }}>
              No one on the waitlist yet. Add a client using the form.
            </p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0' }}>
              {entries.map((entry) => {
                const profile = (entry.clients as { client_profiles?: { name?: string; email?: string; phone?: string } } | null)?.client_profiles
                return (
                  <li key={entry.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.625rem 0', borderBottom: '1px solid #f1f5f9', gap: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                      <div style={{
                        width: '30px', height: '30px', borderRadius: '50%', flexShrink: 0,
                        backgroundColor: '#dbeafe', color: '#1d4ed8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700,
                      }}>
                        {(profile?.name ?? '?').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile?.name ?? '—'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile?.email ?? '—'}
                        </div>
                      </div>
                    </div>
                    <RemoveEntryButton entryId={entry.id} />
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Add client */}
        <div style={{
          backgroundColor: '#fff', border: '1px solid #e2e8f0',
          borderRadius: '10px', padding: '1.25rem',
        }}>
          <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
            Add a client manually
          </h2>
          <AddEntryForm />
        </div>
      </div>

      {/* Settings */}
      <div style={{
        backgroundColor: '#fff', border: '1px solid #e2e8f0',
        borderRadius: '10px', padding: '1.25rem', marginTop: '1.25rem',
      }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0f172a', margin: '0 0 1rem' }}>
          Settings
        </h2>
        <SettingsForm business={business} />
      </div>
    </main>
  )
}
