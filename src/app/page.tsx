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

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#090e1a]">

        {/* Background layer */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(148,163,184,0.06) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div
            className="absolute -top-32 left-1/4 h-[560px] w-[560px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }}
          />
          <div
            className="absolute -top-20 right-1/4 h-[440px] w-[440px] translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }}
          />
        </div>

        {/* Hero content — inner div is centered, text-center flows down */}
        <div className="relative mx-auto max-w-4xl px-6 py-20 text-center md:py-28">

          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-4 py-1.5">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold tracking-widest text-blue-300">
              EARLY ACCESS · FREE TO START
            </span>
          </div>

          <h1
            className="mb-6 text-5xl font-extrabold tracking-tight text-white md:text-7xl"
            style={{ lineHeight: 1.05 }}
          >
            Every cancellation<br />
            <span
              style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #60a5fa 45%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              is revenue back.
            </span>
          </h1>

          <p className="mx-auto mb-8 max-w-md text-lg leading-relaxed text-slate-400">
            SlotFill automatically fills open calendar slots from your waitlist — keeping your schedule full without the manual follow-up.
          </p>

          <div className="mb-10 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" className="h-12 px-7 text-[0.9375rem]">
              <Link href="/signup">Get started free →</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-7 text-[0.9375rem]">
              <Link href="/browse">Browse businesses</Link>
            </Button>
          </div>

          {/* Stats strip */}
          <div className="mx-auto grid max-w-lg grid-cols-3 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.02]">
            {stats.map((s, i) => (
              <div
                key={s.label}
                className={`px-4 py-5 text-center${i > 0 ? ' border-l border-white/[0.07]' : ''}`}
              >
                <div className="mb-1 text-xl font-bold tracking-tight text-white">{s.value}</div>
                <div className="text-xs leading-snug text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Social proof strip ───────────────────────────────────────── */}
      <div className="border-y border-white/[0.06] bg-white/[0.015] py-5">
        <p className="text-center text-xs font-medium uppercase tracking-widest text-slate-600">
          Trusted by service professionals across 40+ industries
        </p>
      </div>

      {/* ── How it works ─────────────────────────────────────────────── */}
      {/*
        Pattern: section = full-width container (handles vertical rhythm)
                 inner div = mx-auto max-w-5xl (handles centering)
      */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">

          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">How it works</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Up and running in 5 minutes
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <div
                key={step.n}
                className="relative rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#151e30] to-[#111827] p-6"
              >
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-10 hidden w-6 translate-x-full border-t border-dashed border-white/[0.12] md:block" />
                )}
                <div
                  className="mb-4 text-4xl font-extrabold tracking-tight"
                  style={{
                    background: 'linear-gradient(135deg, #818cf8, #60a5fa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                  }}
                >
                  {step.n}
                </div>
                <h3 className="mb-3 text-sm font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{step.desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">

          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">Features</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              Built for busy service businesses
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-500/20 hover:bg-white/[0.04]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/15 to-indigo-500/10 text-blue-400">
                  <Icon />
                </div>
                <h3 className="mb-2 text-sm font-semibold text-white">{title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{desc}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <section className="py-12 pb-20">
        <div className="mx-auto max-w-5xl px-6">
          <div
            className="relative overflow-hidden rounded-3xl p-px"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(59,130,246,0.3), rgba(52,211,153,0.3))',
            }}
          >
            <div className="relative overflow-hidden rounded-[23px] bg-[#0c1221] px-8 py-12 text-center md:px-16">
              <div
                className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[500px] -translate-x-1/2 -translate-y-1/2 opacity-60"
                style={{ background: 'radial-gradient(ellipse, rgba(99,102,241,0.18), transparent 70%)' }}
              />
              <h2 className="relative mb-3 text-3xl font-extrabold tracking-tight text-white">
                Stop leaving empty slots on the table
              </h2>
              <p className="relative mb-6 text-sm text-slate-400">
                Free forever on the Starter plan. No credit card required.
              </p>
              <div className="relative flex flex-wrap justify-center gap-3">
                <Button asChild size="lg" className="h-12 px-7 text-[0.9375rem]">
                  <Link href="/signup">Create your free account →</Link>
                </Button>
                <Button asChild size="lg" variant="ghost" className="h-12 px-7 text-[0.9375rem] text-slate-300 hover:text-white">
                  <Link href="/pricing">See pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

    </MarketingLayout>
  )
}
