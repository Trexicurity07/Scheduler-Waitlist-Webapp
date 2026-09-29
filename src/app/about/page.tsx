import MarketingLayout from '@/components/marketing-layout'
import { Card, CardContent } from '@/components/ui/card'

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
      <section className="mx-auto max-w-2xl px-10 pb-16 pt-20 text-center">
        <h1 className="mb-5 text-4xl font-extrabold leading-tight text-white md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          We&apos;re building the scheduling layer businesses deserve
        </h1>
        <p className="text-lg leading-relaxed text-slate-400">
          SlotFill started with a simple observation: every service business loses revenue to last-minute cancellations, and every one of them has a list of clients who would happily take that slot — if only someone told them in time. We built the software that does exactly that.
        </p>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-10 pb-20">
        <h2 className="mb-8 text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>How it works</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map(s => (
            <Card key={s.n} className="border-white/[0.07] bg-[#1e293b]">
              <CardContent className="p-7">
                <div className="mb-3 text-xs font-bold tracking-widest text-blue-400">{s.n}</div>
                <h3 className="mb-2.5 text-base font-semibold text-white">{s.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{s.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Values */}
      <section className="mx-auto max-w-6xl px-10 pb-20">
        <h2 className="mb-8 text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>What we stand for</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {values.map(v => (
            <div key={v.title} className="border-l-2 border-blue-500/40 pl-5">
              <h3 className="mb-2 text-sm font-semibold text-white">{v.title}</h3>
              <p className="text-sm leading-relaxed text-slate-500">{v.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="mx-auto max-w-6xl px-10 pb-24">
        <h2 className="mb-8 text-xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>The team</h2>
        <div className="grid gap-5 sm:grid-cols-4">
          {[
            { name: 'Alex Rivera', role: 'Co-founder & CEO' },
            { name: 'Jordan Kim', role: 'Co-founder & CTO' },
            { name: 'Sam Okafor', role: 'Head of Product' },
            { name: 'Casey Lin', role: 'Lead Engineer' },
          ].map(p => (
            <Card key={p.name} className="border-white/[0.07] bg-[#1e293b]">
              <CardContent className="p-5">
                <div className="mb-3 h-11 w-11 rounded-full border border-blue-500/25 bg-blue-500/15" />
                <div className="text-sm font-semibold text-white">{p.name}</div>
                <div className="mt-0.5 text-xs text-slate-500">{p.role}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </MarketingLayout>
  )
}
