import Link from 'next/link'

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'Your calendar connection session expired. Please try again.',
  failed: 'Something went wrong connecting your calendar. Please try again.',
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const errorMessage = error ? (ERROR_MESSAGES[error] ?? 'An error occurred. Please try again.') : null

  return (
    <main style={{ maxWidth: '480px', margin: '4rem auto', padding: '0 1.5rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        Connect Google Calendar
      </h1>
      <p style={{ color: '#94a3b8', marginBottom: '2rem', lineHeight: 1.6 }}>
        SlotFill monitors your dedicated bookings calendar for cancellations and automatically
        notifies your waitlist.
      </p>

      {errorMessage && (
        <p role="alert" style={{
          backgroundColor: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.25)',
          color: '#fca5a5',
          borderRadius: '8px',
          padding: '0.875rem 1rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
        }}>
          {errorMessage}
        </p>
      )}

      <Link href="/api/oauth/google/start" style={{
        display: 'inline-block',
        padding: '0.75rem 1.5rem',
        backgroundColor: '#3b82f6',
        color: '#fff',
        borderRadius: '8px',
        textDecoration: 'none',
        fontWeight: 600,
        fontSize: '0.9rem',
      }}>
        Connect with Google
      </Link>

      <p style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#94a3b8' }}>
        Already connected?{' '}
        <Link href="/dashboard" style={{ color: '#3b82f6', textDecoration: 'none' }}>
          Go to dashboard
        </Link>
      </p>
    </main>
  )
}
