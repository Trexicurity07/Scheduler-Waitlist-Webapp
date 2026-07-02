import MarketingLayout from '@/components/marketing-layout'

const steps = [
  { n: '01', title: 'Connect your calendar', desc: 'Link your Google Calendar in one click. SlotFill reads your appointments — nothing else.' },
  { n: '02', title: 'Build your waitlist', desc: 'Add clients with their availability preferences. SlotFill stores everything securely.' },
  { n: '03', title: 'Sit back', desc: 'When a cancellation appears, SlotFill offers the slot to the best-matched client and confirms the rebooking automatically.' },
]

const values = [
  { title: 'Privacy first', desc: 'We only access the calendar data we need. We never read event content — just timing.' },
  { title: 'Built for small businesses', desc: 'No enterprise contracts, no per-seat fees. One straightforward plan for independent service providers.' },
  { title: 'Reliability over features', desc: "We'd rather do one thing perfectly than ten things poorly. Our focus is making sure every cancellation slot gets filled." },
]

export default function AboutPage() {
  return (
    <MarketingLayout>
      {/* Mission */}
      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '5rem 2.5rem 4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, color: '#f8fafc', margin: '0 0 1.25rem', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
          We're building the scheduling layer businesses deserve
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.7, margin: 0 }}>
          SlotFill started with a simple observation: every service business loses revenue to last-minute cancellations, and every one of them has a list of clients who would happily take that slot — if only someone told them in time. We built the software that does exactly that.
        </p>
      </section>

      {/* How it works */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2.5rem 5rem' }}>
        <h2 style={{ color: '#f8fafc', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 2rem', letterSpacing: '-0.02em' }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {steps.map(s => (
            <div key={s.n} style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.75rem' }}>
              <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.78rem', letterSpacing: '0.06em', marginBottom: '0.75rem' }}>{s.n}</div>
              <h3 style={{ color: '#f8fafc', fontWeight: 600, fontSize: '1rem', margin: '0 0 0.625rem' }}>{s.title}</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2.5rem 5rem' }}>
        <h2 style={{ color: '#f8fafc', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 2rem', letterSpacing: '-0.02em' }}>What we stand for</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
          {values.map(v => (
            <div key={v.title} style={{ borderLeft: '2px solid rgba(59,130,246,0.4)', paddingLeft: '1.25rem' }}>
              <h3 style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.95rem', margin: '0 0 0.5rem' }}>{v.title}</h3>
              <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 2.5rem 6rem' }}>
        <h2 style={{ color: '#f8fafc', fontSize: '1.4rem', fontWeight: 700, margin: '0 0 2rem', letterSpacing: '-0.02em' }}>The team</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {[
            { name: 'Alex Rivera', role: 'Co-founder & CEO' },
            { name: 'Jordan Kim', role: 'Co-founder & CTO' },
            { name: 'Sam Okafor', role: 'Head of Product' },
            { name: 'Casey Lin', role: 'Lead Engineer' },
          ].map(p => (
            <div key={p.name} style={{ backgroundColor: '#1e293b', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '1.25rem' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                backgroundColor: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)',
                marginBottom: '0.75rem',
              }} />
              <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>{p.name}</div>
              <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '0.2rem' }}>{p.role}</div>
            </div>
          ))}
        </div>
      </section>
    </MarketingLayout>
  )
}
