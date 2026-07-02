import Link from 'next/link'
import MarketingLayout from '@/components/marketing-layout'

const features = [
  {
    title: 'Google Calendar sync',
    desc: 'Connect your existing calendar in one click. SlotFill watches for cancellations so you never have to.',
  },
  {
    title: 'Instant waitlist offers',
    desc: 'The moment a slot opens, the next eligible client on your waitlist gets a time-limited offer automatically.',
  },
  {
    title: 'Zero manual follow-up',
    desc: 'Confirmations, declines, and rebooking all happen without you lifting a finger.',
  },
]

export default function HomePage() {
  return (
    <MarketingLayout>
      {/* Hero */}
      <section style={{
        maxWidth: '900px', margin: '0 auto',
        padding: '6rem 2.5rem 5rem',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          backgroundColor: 'rgba(59,130,246,0.12)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: '100px',
          padding: '0.3rem 0.9rem',
          fontSize: '0.78rem',
          fontWeight: 600,
          color: '#93c5fd',
          letterSpacing: '0.04em',
          marginBottom: '1.5rem',
        }}>
          Now in early access
        </div>
        <h1 style={{
          fontSize: 'clamp(2.25rem, 5vw, 3.5rem)',
          fontWeight: 800,
          color: '#f8fafc',
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          margin: '0 0 1.25rem',
        }}>
          Fill every cancellation.<br />Automatically.
        </h1>
        <p style={{
          color: '#94a3b8',
          fontSize: '1.1rem',
          lineHeight: 1.65,
          maxWidth: '540px',
          margin: '0 auto 2.5rem',
        }}>
          SlotFill connects to your Google Calendar and manages your waitlist for you — notifying the right client the moment a spot opens up.
        </p>
        <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/signup" style={{
            padding: '0.75rem 1.75rem',
            backgroundColor: '#3b82f6', color: '#fff',
            borderRadius: '8px', textDecoration: 'none',
            fontWeight: 600, fontSize: '0.9rem',
          }}>
            Get started free
          </Link>
          <Link href="/pricing" style={{
            padding: '0.75rem 1.75rem',
            backgroundColor: 'transparent', color: '#cbd5e1',
            border: '1px solid rgba(255,255,255,0.14)',
            borderRadius: '8px', textDecoration: 'none',
            fontWeight: 500, fontSize: '0.9rem',
          }}>
            See pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: '0 2.5rem 6rem',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
      }}>
        {features.map(f => (
          <div key={f.title} style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            padding: '1.75rem',
          }}>
            <h3 style={{ color: '#f8fafc', fontWeight: 600, fontSize: '1rem', margin: '0 0 0.625rem' }}>
              {f.title}
            </h3>
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>
              {f.desc}
            </p>
          </div>
        ))}
      </section>

      {/* CTA banner */}
      <section style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: '0 2.5rem 6rem',
      }}>
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid rgba(59,130,246,0.2)',
          borderRadius: '14px',
          padding: '3rem 2.5rem',
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#f8fafc', fontSize: '1.6rem', fontWeight: 700, margin: '0 0 0.75rem', letterSpacing: '-0.02em' }}>
            Ready to stop leaving slots empty?
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.75rem' }}>
            Set up takes under 5 minutes. No credit card required.
          </p>
          <Link href="/signup" style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#3b82f6', color: '#fff',
            borderRadius: '8px', textDecoration: 'none',
            fontWeight: 600, fontSize: '0.9rem',
          }}>
            Create your business account
          </Link>
        </div>
      </section>
    </MarketingLayout>
  )
}
