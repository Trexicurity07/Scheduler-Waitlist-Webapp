import Link from 'next/link'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      fontFamily: 'var(--font-geist-sans)',
    }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{
          color: '#f8fafc',
          fontSize: '2.5rem',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: 0,
        }}>
          SlotFill
        </h1>
        <p style={{
          color: '#64748b',
          fontSize: '1rem',
          marginTop: '0.75rem',
          maxWidth: '360px',
          lineHeight: 1.6,
        }}>
          Automatically fill cancelled appointment slots from your waitlist — no manual follow-up needed.
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '2rem',
          width: '260px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Business owner
          </div>
          <h2 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
            Manage your waitlist
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            Connect your Google Calendar, configure your waitlist, and let SlotFill handle cancellations automatically.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Link href="/login" style={{
              display: 'block', textAlign: 'center', padding: '0.625rem',
              backgroundColor: '#3b82f6', color: '#fff', borderRadius: '7px',
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
            }}>
              Log in
            </Link>
            <Link href="/signup" style={{
              display: 'block', textAlign: 'center', padding: '0.625rem',
              backgroundColor: 'transparent', color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px',
              textDecoration: 'none', fontSize: '0.875rem',
            }}>
              Create account
            </Link>
          </div>
        </div>

        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          padding: '2rem',
          width: '260px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
        }}>
          <div style={{ color: '#94a3b8', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Client
          </div>
          <h2 style={{ color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
            Join a waitlist
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
            Get notified the moment a cancellation opens up at a business you already visit.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
            <Link href="/client/login" style={{
              display: 'block', textAlign: 'center', padding: '0.625rem',
              backgroundColor: '#0ea5e9', color: '#fff', borderRadius: '7px',
              textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
            }}>
              Log in
            </Link>
            <Link href="/client/signup" style={{
              display: 'block', textAlign: 'center', padding: '0.625rem',
              backgroundColor: 'transparent', color: '#94a3b8',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px',
              textDecoration: 'none', fontSize: '0.875rem',
            }}>
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
