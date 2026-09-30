import MarketingLayout from '@/components/marketing-layout'

const steps = [
  {
    n: '01',
    title: 'Connect your calendar',
    desc: 'Link your Google Calendar in one click. SlotFill reads your appointments — nothing else.',
  },
  {
    n: '02',
    title: 'Build your waitlist',
    desc: 'Add clients with their availability preferences. SlotFill stores everything securely.',
  },
  {
    n: '03',
    title: 'Sit back',
    desc: 'When a cancellation appears, SlotFill offers the slot to the best-matched client and confirms the rebooking automatically.',
  },
]

const values = [
  {
    title: 'Privacy first',
    desc: 'We only access the calendar data we need. We never read event content — just timing.',
  },
  {
    title: 'Built for small businesses',
    desc: 'No enterprise contracts, no per-seat fees. One straightforward plan for independent service providers.',
  },
  {
    title: 'Reliability over features',
    desc: "We'd rather do one thing perfectly than ten things poorly. Our focus is making sure every cancellation slot gets filled.",
  },
]

const team = [
  { name: '[Founder Name]', role: 'Co-founder & CEO' },
  { name: '[Founder Name]', role: 'Co-founder & CTO' },
  { name: '[Team Member]', role: 'Head of Product' },
  { name: '[Team Member]', role: 'Lead Engineer' },
]

export default function AboutPage() {
  return (
    <MarketingLayout>

      {/* ── Mission hero ─────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-[#090e1a] pb-6 pt-20">
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(148,163,184,0.05) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <div
            className="absolute -top-20 left-1/2 h-[440px] w-[560px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }}
          />
          <div
            className="absolute -top-10 right-1/4 h-[320px] w-[320px] translate-x-1/2 rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }}
          />
        </div>
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-400">About SlotFill</p>
          <h1
            className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-white md:text-5xl"
            style={{ letterSpacing: '-0.03em' }}
          >
            The scheduling layer{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #60a5fa 55%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              businesses deserve
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-400">
            [Company description placeholder — replace with your actual company story and founding mission before going live.]
          </p>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">How it works</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
              Up and running in 5 minutes
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="relative rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#151e30] to-[#111827] p-6"
              >
                {i < steps.length - 1 && (
                  <div className="absolute right-0 top-10 hidden w-6 translate-x-full border-t border-dashed border-white/[0.12] sm:block" />
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
                  {s.n}
                </div>
                <h3 className="mb-2.5 text-sm font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">Our principles</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
              What we stand for
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {values.map(v => (
              <div key={v.title} className="border-l-2 border-blue-500/40 pl-5">
                <h3 className="mb-2 text-sm font-semibold text-white">{v.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────────────── */}
      <section className="py-16 pb-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-10 text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-blue-400">The team</p>
            <h2 className="text-3xl font-extrabold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
              The people behind SlotFill
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {team.map(p => (
              <div
                key={p.name}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-sm transition-all duration-200 hover:border-blue-500/20 hover:bg-white/[0.04]"
              >
                <div className="mb-4 h-11 w-11 rounded-full border border-blue-500/25 bg-gradient-to-br from-blue-500/20 to-indigo-500/10" />
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{p.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </MarketingLayout>
  )
}
