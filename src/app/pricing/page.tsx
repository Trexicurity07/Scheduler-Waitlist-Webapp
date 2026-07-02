'use client'

import Link from 'next/link'
import MarketingLayout from '@/components/marketing-layout'
import { useLocalPrice } from '@/lib/hooks/use-local-price'

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
    href: 'mailto:hello@slotfill.io',
    highlight: false,
  },
]

export default function PricingPage() {
  const { formatPrice } = useLocalPrice()

  return (
    <MarketingLayout>
      <section style={{ maxWidth: '600px', margin: '0 auto', padding: '5rem 2.5rem 3.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', fontWeight: 800, color: '#f8fafc', margin: '0 0 1rem', letterSpacing: '-0.03em' }}>
          Simple, honest pricing
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.65, margin: 0 }}>
          Start free. Upgrade when your waitlist grows. No hidden fees, no per-seat charges.
        </p>
      </section>

      <section style={{
        maxWidth: '1100px', margin: '0 auto',
        padding: '0 2.5rem 6rem',
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem', alignItems: 'stretch',
      }}>
        {plans.map(plan => (
          <div key={plan.name} style={{
            backgroundColor: plan.highlight ? '#1e3a5f' : '#1e293b',
            border: plan.highlight ? '1px solid rgba(59,130,246,0.4)' : '1px solid rgba(255,255,255,0.07)',
            borderRadius: '14px',
            padding: '2rem',
            position: 'relative',
            display: 'flex', flexDirection: 'column',
          }}>
            {plan.highlight && (
              <div style={{
                position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                backgroundColor: '#3b82f6', color: '#fff',
                fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.06em',
                padding: '0.25rem 0.875rem', borderRadius: '100px',
              }}>
                MOST POPULAR
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.5rem' }}>
                {plan.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                <span style={{ color: '#f8fafc', fontSize: '2.25rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {plan.usdPrice === null ? 'Custom' : formatPrice(plan.usdPrice)}
                </span>
                {plan.sub && <span style={{ color: '#64748b', fontSize: '0.875rem' }}>{plan.sub}</span>}
              </div>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.55, margin: '0.625rem 0 0' }}>
                {plan.desc}
              </p>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
              {plan.features.map(f => (
                <li key={f} style={{ display: 'flex', gap: '0.5rem', color: '#cbd5e1', fontSize: '0.875rem' }}>
                  <span style={{ color: '#3b82f6', fontWeight: 700, flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link href={plan.href} style={{
              display: 'block', textAlign: 'center',
              padding: '0.675rem',
              backgroundColor: plan.highlight ? '#3b82f6' : 'transparent',
              color: plan.highlight ? '#fff' : '#94a3b8',
              border: plan.highlight ? 'none' : '1px solid rgba(255,255,255,0.14)',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 600, fontSize: '0.875rem',
            }}>
              {plan.cta}
            </Link>
          </div>
        ))}
      </section>

      <section style={{ maxWidth: '700px', margin: '0 auto', padding: '0 2.5rem 6rem', textAlign: 'center' }}>
        <h2 style={{ color: '#f8fafc', fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.75rem' }}>
          Still have questions?
        </h2>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1.25rem' }}>
          We&apos;re happy to walk you through the product or help you pick the right plan.
        </p>
        <a href="mailto:hello@slotfill.io" style={{ color: '#93c5fd', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 500 }}>
          hello@slotfill.io
        </a>
      </section>
    </MarketingLayout>
  )
}
