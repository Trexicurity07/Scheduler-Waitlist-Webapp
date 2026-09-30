'use client'

import Link from 'next/link'
import MarketingLayout from '@/components/marketing-layout'
import { useLocalPrice } from '@/lib/hooks/use-local-price'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
      <section className="mx-auto max-w-xl px-10 pb-14 pt-20 text-center">
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-white md:text-5xl" style={{ letterSpacing: '-0.03em' }}>
          Simple, honest pricing
        </h1>
        <p className="text-lg leading-relaxed text-slate-400">
          Start free. Upgrade when your waitlist grows. No hidden fees, no per-seat charges.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-10 pb-24">
        <div className="grid items-stretch gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map(plan => (
            <div
              key={plan.name}
              className={cn(
                'relative flex flex-col rounded-2xl border p-8',
                plan.highlight
                  ? 'border-blue-500/40 bg-[#1e3a5f]'
                  : 'border-white/[0.07] bg-[#1e293b]'
              )}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-500 px-3.5 py-1 text-[0.7rem] font-bold tracking-widest text-white">
                  MOST POPULAR
                </div>
              )}

              <div className="mb-6">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {plan.name}
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold tracking-tight text-white" style={{ letterSpacing: '-0.03em' }}>
                    {plan.usdPrice === null ? 'Custom' : formatPrice(plan.usdPrice)}
                  </span>
                  {plan.sub && <span className="text-sm text-slate-500">{plan.sub}</span>}
                </div>
                <p className="mt-2.5 text-sm leading-snug text-slate-400">{plan.desc}</p>
              </div>

              <ul className="mb-7 flex flex-1 flex-col gap-2">
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
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-xl px-10 pb-24 text-center">
        <h2 className="mb-3 text-xl font-bold text-white">Still have questions?</h2>
        <p className="mb-5 text-sm text-slate-400">
          We&apos;re happy to walk you through the product or help you pick the right plan.
        </p>
        <span className="text-sm font-medium text-slate-500">
          hello@example.com — placeholder, not monitored
        </span>
      </section>
    </MarketingLayout>
  )
}
