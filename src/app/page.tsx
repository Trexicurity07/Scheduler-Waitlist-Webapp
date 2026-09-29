import Link from 'next/link'
import MarketingLayout from '@/components/marketing-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

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
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#0f172a] to-[#1e1b4b]">
        <div className="mx-auto max-w-4xl px-10 py-24 text-center md:py-32">
          <div className="mb-6 inline-block rounded-full border border-blue-500/25 bg-blue-500/10 px-3.5 py-1 text-xs font-semibold tracking-widest text-blue-300">
            NOW IN EARLY ACCESS
          </div>
          <h1 className="mb-5 text-5xl font-extrabold leading-tight text-white md:text-6xl" style={{ letterSpacing: '-0.03em' }}>
            Book the slot<br />that opened up.
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-slate-400">
            Join the waitlist. Get notified instantly when a cancellation matches your schedule.
          </p>
          <div className="flex flex-wrap justify-center gap-3.5">
            <Button asChild size="lg">
              <Link href="/browse">Browse businesses</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/signup">Owner signup</Link>
            </Button>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-10 pb-24 pt-16">
        <div className="grid gap-5 sm:grid-cols-3">
          {features.map(f => (
            <Card key={f.title} className="border-white/[0.07] bg-[#1e293b]">
              <CardContent className="p-7">
                <h3 className="mb-2.5 text-base font-semibold text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-slate-500">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="mx-auto max-w-6xl px-10 pb-24">
        <div className="rounded-2xl border border-blue-500/20 bg-[#1e293b] px-10 py-12 text-center">
          <h2 className="mb-3 text-2xl font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
            Ready to stop leaving slots empty?
          </h2>
          <p className="mb-7 text-sm text-slate-400">
            Set up takes under 5 minutes. No credit card required.
          </p>
          <Button asChild size="lg">
            <Link href="/signup">Create your business account</Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  )
}
