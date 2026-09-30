import Link from 'next/link'
import MarketingLayout from '@/components/marketing-layout'
import { Button } from '@/components/ui/button'

function IconCalendarCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z" />
      <path d="m9 16 2 2 4-4" />
    </svg>
  )
}

function IconZap() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function IconTarget() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
}

function IconMail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  )
}

function IconChart() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}

const steps = [
  {
    n: '01',
    title: 'Connect your calendar',
    desc: 'Link Google Calendar in one click. SlotFill watches for cancellations automatically — no manual monitoring needed.',
  },
  {
    n: '02',
    title: 'Clients join your waitlist',
    desc: 'Share a simple link. Clients submit their availability once and SlotFill remembers their preferences.',
  },
  {
    n: '03',
    title: 'Slots fill themselves',
    desc: 'The moment a cancellation opens, the best-matched client gets a time-limited offer. No calls, no chasing.',
  },
]

const features = [
  {
    Icon: IconCalendarCheck,
    title: 'Google Calendar sync',
    desc: 'Two-way sync keeps your schedule accurate across all your devices in real time.',
  },
  {
    Icon: IconZap,
    title: 'Instant slot offers',
    desc: 'Clients are notified within seconds of a match — not hours. First to respond gets the slot.',
  },
  {
    Icon: IconTarget,
    title: 'Smart matching',
    desc: 'Match clients by availability, preference, and wait time — not just queue order.',
  },
  {
    Icon: IconMail,
    title: 'Automated follow-up',
    desc: 'Confirmations, reminders, and rebooking handled automatically without lifting a finger.',
  },
  {
    Icon: IconChart,
    title: 'Utilization analytics',
    desc: 'See your fill rate, cancellation patterns, and revenue impact at a glance.',
  },
  {
    Icon: IconShare,
    title: 'Simple client experience',
    desc: 'Clients join via a link — no app downloads, no account required on their end.',
  },
]

const stats = [
  { value: '< 30s', label: 'Avg. time to fill a slot' },
  { value: '97%', label: 'Fill rate across services' },
  { value: '5 min', label: 'Setup time' },
]

export default function HomePage() {
  return (
    <MarketingLayout>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', overflow: 'hidden', background: '#090e1a' }}>
        {/* Radial glow */}
        <div style={{
          position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 600,
          background: 'radial-gradient(ellipse, rgba(99,102,241,0.13) 0%, rgba(59,130,246,0.07) 40%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        {/* Dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.07) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          pointerEvents: 'none',
        }} />

        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center md:py-40">
          {/* Badge */}
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-1.5">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span className="text-xs font-semibold tracking-widest text-blue-300">EARLY ACCESS · FREE TO START</span>
          </div>

          {/* Headline */}
          <h1
            className="mb-6 font-extrabold text-white"
            style={{ fontSize: 'clamp(2.6rem, 8vw, 5.5rem)', letterSpacing: '-0.04em', lineHeight: 1.05 }}
          >
            Every cancellation<br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #60a5fa 45%, #34d399 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            }}>
              is revenue back.
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-lg text-lg leading-relaxed text-slate-400">
            SlotFill automatically fills open calendar slots from your waitlist — keeping your schedule full without the manual follow-up.
          </p>

          {/* CTAs */}
          <div className="mb-14 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" style={{ height: 48, paddingLeft: 28, paddingRight: 28, fontSize: '0.95rem' }}>
              <Link href="/signup">Get started free →</Link>
            </Button>
            <Button asChild size="lg" variant="outline" style={{ height: 48, paddingLeft: 28, paddingRight: 28, fontSize: '0.95rem' }}>
              <Link href="/browse">Browse businesses</Link>
            </Button>
          </div>

          {/* Stats strip */}
          <div
            className="mx-auto grid grid-cols-3 max-w-lg"
            style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, overflow: 'hidden', background: 'rgba(255,255,255,0.02)' }}
          >
            {stats.map((s, i) => (
              <div
                key={s.label}
                className="px-4 py-5 text-center"
                style={i > 0 ? { borderLeft: '1px solid rgba(255,255,255,0.07)' } : undefined}
              >
                <div className="mb-1 text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>{s.value}</div>
                <div className="text-slate-500" style={{ fontSize: 11, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">How it works</p>
          <h2 className="text-3xl font-extrabold text-white" style={{ letterSpacing: '-0.03em' }}>
            Up and running in 5 minutes
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map(step => (
            <div
              key={step.n}
              style={{
                borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.07)',
                background: 'linear-gradient(160deg, #151e30, #111827)',
                padding: '28px',
              }}
            >
              <div
                className="mb-5 text-4xl font-extrabold"
                style={{
                  background: 'linear-gradient(135deg, #818cf8, #60a5fa)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                  letterSpacing: '-0.03em',
                }}
              >
                {step.n}
              </div>
              <h3 className="mb-2.5 font-semibold text-white" style={{ fontSize: '0.9375rem' }}>{step.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="mb-14 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">Features</p>
          <h2 className="text-3xl font-extrabold text-white" style={{ letterSpacing: '-0.03em' }}>
            Built for busy service businesses
          </h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-white/[0.06] bg-[#111827] p-6 transition-colors duration-200 hover:border-blue-500/20 hover:bg-[#131e30]"
            >
              <div
                className="mb-4"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 40, height: 40, borderRadius: 10,
                  background: 'rgba(59,130,246,0.1)',
                  border: '1px solid rgba(59,130,246,0.2)',
                  color: '#60a5fa',
                }}
              >
                <Icon />
              </div>
              <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-28">
        <div style={{
          position: 'relative', borderRadius: 24, padding: 1,
          background: 'linear-gradient(135deg, rgba(99,102,241,0.5) 0%, rgba(59,130,246,0.3) 50%, rgba(52,211,153,0.3) 100%)',
        }}>
          <div style={{
            position: 'relative', borderRadius: 23, padding: '56px 40px',
            background: '#0c1221', textAlign: 'center', overflow: 'hidden',
          }}>
            {/* Ambient glow */}
            <div style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 500, height: 250,
              background: 'radial-gradient(ellipse, rgba(99,102,241,0.12), transparent 70%)',
              pointerEvents: 'none',
            }} />

            <h2 className="relative mb-3 text-3xl font-extrabold text-white" style={{ letterSpacing: '-0.03em' }}>
              Stop leaving empty slots on the table
            </h2>
            <p className="relative mb-8 text-sm text-slate-400">
              Free forever on the Starter plan. No credit card required.
            </p>
            <div className="relative flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" style={{ height: 48, paddingLeft: 28, paddingRight: 28, fontSize: '0.95rem' }}>
                <Link href="/signup">Create your free account →</Link>
              </Button>
              <Button asChild size="lg" variant="outline" style={{ height: 48, paddingLeft: 28, paddingRight: 28, fontSize: '0.95rem' }}>
                <Link href="/pricing">See pricing</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </MarketingLayout>
  )
}
