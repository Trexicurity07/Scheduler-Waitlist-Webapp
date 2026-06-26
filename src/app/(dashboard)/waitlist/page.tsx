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
    <main>
      <h1>Waitlist — {business.name}</h1>

      <section>
        <h2>Active waitlist ({entries?.length ?? 0})</h2>
        {!entries || entries.length === 0 ? (
          <p>No one is on the waitlist yet.</p>
        ) : (
          <ul>
            {entries.map((entry) => (
              <li key={entry.id}>
                {(entry.clients as { client_profiles?: { name?: string; email?: string; phone?: string } } | null)
                  ?.client_profiles?.name ?? '—'}{' '}
                ({(entry.clients as { client_profiles?: { email?: string } } | null)?.client_profiles?.email ?? '—'}){' '}
                <RemoveEntryButton entryId={entry.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Add a client manually</h2>
        <AddEntryForm />
      </section>

      <section>
        <h2>Settings</h2>
        <SettingsForm business={business} />
      </section>
    </main>
  )
}
