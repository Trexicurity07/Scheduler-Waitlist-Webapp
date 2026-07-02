import { getCurrentClient } from '@/lib/client-auth/get-current-client'
import ApplyForm from './apply-form'

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { supabase, profile } = await getCurrentClient()

  const { data: business } = await supabase
    .from('businesses')
    .select('id, name, business_type, whatsapp_number')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!business) {
    return (
      <main style={{ maxWidth: '480px', margin: '6rem auto', padding: '0 1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.5rem' }}>
          Business not found
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
          This waitlist link is no longer active.
        </p>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 0.375rem' }}>
          Join the waitlist
        </h1>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: '#cbd5e1', margin: '0 0 0.25rem' }}>
          {business.name}
        </p>
        {business.business_type && (
          <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>
            {business.business_type}
          </p>
        )}
      </div>

      <div style={{
        backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '10px', padding: '1.25rem', marginBottom: '1.25rem',
      }}>
        <p style={{ fontSize: '0.875rem', color: '#94a3b8', margin: '0 0 0.25rem' }}>
          Applying as
        </p>
        <p style={{ fontSize: '0.875rem', color: '#f8fafc', margin: 0, fontWeight: 500 }}>
          {profile.name} · {profile.email}
        </p>
      </div>

      <ApplyForm slug={slug} />
    </main>
  )
}
