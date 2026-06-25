import { notFound } from 'next/navigation'
import { createServiceRoleClient } from '@/lib/db/supabase'
import { JoinWaitlistForm } from './join-waitlist-form'

export default async function JoinWaitlistPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = createServiceRoleClient()
  const { data: business } = await supabase
    .from('businesses')
    .select('name, public_slug')
    .eq('public_slug', slug)
    .maybeSingle()

  if (!business) {
    notFound()
  }

  return (
    <main>
      <h1>Join the waitlist for {business.name}</h1>
      <p>
        Tell us when you&apos;re usually available. If a matching slot opens up, we&apos;ll email and WhatsApp you
        right away. Signups are automatically removed after 14 days.
      </p>
      <JoinWaitlistForm businessSlug={business.public_slug} />
    </main>
  )
}
