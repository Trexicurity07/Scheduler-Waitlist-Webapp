'use client'

import Link from 'next/link'
import MarketingLayout from '@/components/marketing-layout'
import { useLocalPrice } from '@/lib/hooks/use-local-price'
import { Button } from '@/components/ui/button'

const plans = [
  {
    name: 'Starter',
    usdPrice: 0,
    sub: 'forever',
    desc: 'Perfect for getting started and testing the workflow.',
    features: [
      'Up to 20 active waitlist spots',
      '1 Google Calendar connection',
      'Automatic slot offers via email',
      'Basic dashboard',
    ],
    cta: 'Get started free',
    href: '/signup?plan=starter',
    highlight: false,
  },
  {
    name: 'Pro',
    usdPrice: 49,
    sub: 'per month',
    desc: 'For established businesses that need full capacity.',
    features: [
      'Unlimited waitlist spots',
      '1 Google Calendar connection',
      'Automatic slot offers via email',
      'WhatsApp notifications',
      'Advanced analytics',
      'Priority email support',
    ],
    cta: 'Get started',
    href: '/signup?plan=pro',
    highlight: true,
  },
  {
    name: 'Max',
    usdPrice: 149,
    sub: 'per month',
    desc: 'For growing businesses that need advanced controls and reporting.',
    features: [
      'Everything in Pro',
      'Multiple calendar connections',
      'Custom branding on client emails',
      'Advanced analytics & reporting',
      'API access',
      'Dedicated onboarding call',
    ],
    cta: 'Get started',
    href: '/signup?plan=max',
    highlight: false,
  },
  {
    name: 'Enterprise',
    usdPrice: null,
    sub: '',
    desc: 'For multi-location businesses, franchises, and white-label deployments.',
    features: [
      'Everything in Max',
      'Unlimited calendar connections',
      'White-label option',
      'Dedicated account manager',
      'Custom SLA guarantee',
      'Volume & annual discounts',
    ],
    cta: 'Contact sales',
    href: '#',
    highlight: false,
  },
]

export default function PricingPage() {
  const { formatPrice } = useLocalPrice()

  return (
    <MarketingLayout>

      {/* ── Hero ─────────────────────────────────────────────────────── */}
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
            className="absolute -top-24 left-1/2 h-[480px] w-[640px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }}
          />
        </div>
        <div className="relative mx-auto max-w-2xl px-6 text-center">
          <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-blue-400">Pricing</p>
          <h1
            className="mb-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl"
            style={{ letterSpacing: '-0.03em' }}
          >
            Simple, honest{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #60a5fa 55%, #34d399 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              pricing
            </span>
          </h1>
          <p className="text-lg leading-relaxed text-slate-400">
            Start free. Upgrade when your waitlist grows. No hidden fees, no per-seat charges.
          </p>
        </div>
      </section>

      {/* ── Plans grid ───────────────────────────────────────────────── */}
      <section className="py-12 pb-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {plans.map(plan => {
              const inner = (
                <>
                  <div className="mb-6">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                      {plan.name}
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span
                        className="text-4xl font-extrabold tracking-tight text-white"
                        style={{ letterSpacing: '-0.03em' }}
                      >
                        {plan.usdPrice === null ? 'Custom' : formatPrice(plan.usdPrice)}
                      </span>
                      {plan.sub && <span className="text-sm text-slate-500">{plan.sub}</span>}
                    </div>
                    <p className="mt-2.5 text-sm leading-snug text-slate-400">{plan.desc}</p>
                  </div>

                  <ul className="mb-7 flex flex-1 flex-col gap-2.5">
                    {plan.features.map(f => (
                      <li key={f} className="flex gap-2 text-sm text-slate-300">
                        <span className="shrink-0 font-bold text-blue-400">✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Button asChild variant={plan.highlight ? 'default' : 'outline'} className="w-full">
                    <Link href={plan.href}>{plan.cta}</Link>
                  </Button>
                </>
              )

              if (plan.highlight) {
                return (
                  <div
                    key={plan.name}
                    className="relative rounded-2xl p-px"
                    style={{
                      background:
                        'linear-gradient(135deg, rgba(99,102,241,0.7), rgba(59,130,246,0.5), rgba(52,211,153,0.3))',
                    }}
                  >
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 px-3.5 py-1 text-[0.7rem] font-bold tracking-widest text-white">
                      MOST POPULAR
                    </div>
                    <div className="flex h-full flex-col rounded-[15px] bg-[#0c1221] p-8">
                      {inner}
                    </div>
                  </div>
                )
              }

              return (
                <div
                  key={plan.name}
                  className="relative flex flex-col rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 backdrop-blur-sm transition-all duration-200 hover:border-white/[0.10] hover:bg-white/[0.03]"
                >
                  {inner}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ strip ────────────────────────────────────────────────── */}
      <section className="pb-20 pt-2">
        <div className="mx-auto max-w-5xl px-6">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-8 py-10 text-center backdrop-blur-sm">
            <h2 className="mb-3 text-xl font-bold text-white">Still have questions?</h2>
            <p className="mb-5 text-sm text-slate-400">
              We&apos;re happy to walk you through the product or help you pick the right plan.
            </p>
            <span className="text-sm font-medium text-slate-500">
              hello@example.com — placeholder, not monitored
            </span>
          </div>
        </div>
      </section>

    </MarketingLayout>
  )
}
