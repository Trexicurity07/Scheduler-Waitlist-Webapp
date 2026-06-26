import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/db/supabase'
import ApplyForm from './apply-form'

export default async function JoinPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(`/client/login?next=/join/${slug}`)

  const serviceSupabase = createServiceRoleClient()
  const { data: business } = await serviceSupabase
    .from('businesses')
    .select('id, name, business_type, whatsapp_number')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!business) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Business not found</h1>
        <p>This waitlist link is no longer active.</p>
      </main>
    )
  }

  const { data: profile } = await serviceSupabase
    .from('client_profiles')
    .select('name, email, phone, verified_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile || !profile.verified_at) redirect('/client/login')

  return (
    <main style={{ padding: '2rem' }}>
      <h2>Join the waitlist for {business.name}</h2>
      {business.business_type && <p>Type: {business.business_type}</p>}
      {business.whatsapp_number && <p>Contact: {business.whatsapp_number}</p>}
      <p>Applying as: {profile.name} ({profile.email})</p>
      <ApplyForm slug={slug} />
    </main>
  )
}
