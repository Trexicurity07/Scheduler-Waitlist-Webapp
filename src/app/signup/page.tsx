'use client'

import { useState, type FormEvent, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FieldError } from '@/components/field-error'
import { inputStyle, labelStyle, pageWrapperStyle, h1Style, subtitleStyle, showPasswordBtnStyle, hintTextStyle } from '@/lib/ui/theme'
import { useLocalPrice } from '@/lib/hooks/use-local-price'

const PLANS = [
  { key: 'starter' as const, label: 'Starter', usdPrice: 0, sub: 'forever' },
  { key: 'pro' as const, label: 'Pro', usdPrice: 49, sub: '/ month' },
  { key: 'max' as const, label: 'Max', usdPrice: 149, sub: '/ month' },
]

function detectField(msg: string): 'businessName' | 'email' | 'password' {
  const m = msg.toLowerCase()
  if (m.includes('business') || m.includes('name taken') || m === 'name taken') return 'businessName'
  if (m.includes('password') || m.includes('upper') || m.includes('lower') ||
      m.includes('digit') || m.includes('number') || m.includes('72') || m.includes('space')) return 'password'
  return 'email'
}

function SignupPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { formatPrice } = useLocalPrice()
  const [step, setStep] = useState<'form' | 'verify' | 'payment'>('form')
  const [pendingEmail, setPendingEmail] = useState('')
  const [plan, setPlan] = useState<'starter' | 'pro' | 'max'>(() => {
    const p = searchParams.get('plan')
    return p === 'pro' || p === 'max' ? p : 'starter'
  })

  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'businessName' | 'email' | 'password'>('email')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [code, setCode] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)

  const [paymentSession, setPaymentSession] = useState('')
  const [cardName, setCardName] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [cardExpiry, setCardExpiry] = useState('')
  const [cardCvv, setCardCvv] = useState('')
  const [payError, setPayError] = useState<string | null>(null)
  const [payLoading, setPayLoading] = useState(false)

  const selectedPlan = PLANS.find(p => p.key === plan)!

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, businessName, plan }),
    })
    const body = await response.json()
    setLoading(false)
    if (!response.ok || !body.ok) {
      const msg = body.error ?? 'Something went wrong. Please try again.'
      setError(msg); setErrorField(detectField(msg)); return
    }
    setPendingEmail(email.toLowerCase())
    setStep('verify')
  }

  async function handleVerify(event: FormEvent) {
    event.preventDefault()
    setVerifyError(null)
    setVerifyLoading(true)
    const response = await fetch('/api/signup/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail, code }),
    })
    const body = await response.json()
    setVerifyLoading(false)
    if (!response.ok || !body.ok) { setVerifyError(body.error ?? 'Something went wrong. Please try again.'); return }
    if (body.requiresPayment) {
      setPaymentSession(body.paymentSession as string)
      setStep('payment')
      return
    }
    router.push('/about')
  }

  async function handlePayment(event: FormEvent) {
    event.preventDefault()
    setPayError(null)
    setPayLoading(true)
    const response = await fetch('/api/signup/complete-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentSession }),
    })
    const body = await response.json()
    setPayLoading(false)
    if (!response.ok || !body.ok) { setPayError(body.error ?? 'Payment failed. Please try again.'); return }
    router.push('/about')
  }

  if (step === 'payment') {
    return (
      <main style={pageWrapperStyle}>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => setStep('form')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>← Start over</button>
          <h1 style={h1Style}>Complete your {selectedPlan.label} subscription</h1>
          <p style={subtitleStyle}>You&apos;re almost there — enter your payment details below.</p>
        </div>

        <form onSubmit={handlePayment} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{
            backgroundColor: '#1e293b',
            border: '1px solid rgba(59,130,246,0.3)',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ color: '#f8fafc', fontWeight: 600, fontSize: '0.9rem' }}>{selectedPlan.label} plan</div>
              <div style={{ color: '#64748b', fontSize: '0.775rem', marginTop: '0.15rem' }}>Billed monthly · cancel anytime</div>
            </div>
            <div style={{ color: '#3b82f6', fontWeight: 700, fontSize: '1.05rem' }}>{formatPrice(selectedPlan.usdPrice)}/mo</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>
              Cardholder name
              <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} required placeholder="Jane Smith" autoComplete="cc-name" style={inputStyle} />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>
              Card number
              <input
                type="text" inputMode="numeric" value={cardNumber}
                onChange={(e) => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 16)
                  setCardNumber(d.match(/.{1,4}/g)?.join(' ') ?? d)
                }}
                required placeholder="1234 5678 9012 3456" autoComplete="cc-number" maxLength={19} style={inputStyle}
              />
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>
                Expiry
                <input
                  type="text" inputMode="numeric" value={cardExpiry}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
                    setCardExpiry(raw.length > 2 ? raw.slice(0, 2) + '/' + raw.slice(2) : raw)
                  }}
                  required placeholder="MM/YY" autoComplete="cc-exp" maxLength={5} style={inputStyle}
                />
              </label>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={labelStyle}>
                CVV
                <input
                  type="text" inputMode="numeric" value={cardCvv}
                  onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  required placeholder="123" autoComplete="cc-csc" maxLength={4} style={inputStyle}
                />
              </label>
            </div>
          </div>

          {payError && <FieldError message={payError} />}

          <button
            type="submit" disabled={payLoading}
            style={{ padding: '0.675rem', backgroundColor: payLoading ? '#93c5fd' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.875rem', cursor: payLoading ? 'default' : 'pointer' }}
          >
            {payLoading ? 'Processing…' : `Pay ${formatPrice(selectedPlan.usdPrice)}/month`}
          </button>
        </form>

        <p style={{ marginTop: '0.875rem', fontSize: '0.75rem', color: '#64748b', textAlign: 'center' }}>
          Your card details are encrypted and processed securely.
        </p>
      </main>
    )
  }

  if (step === 'verify') {
    return (
      <main style={pageWrapperStyle}>
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => setStep('form')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>← Back</button>
          <h1 style={h1Style}>Check your email</h1>
          <p style={subtitleStyle}>We sent a 6-digit code to <strong style={{ color: '#f8fafc' }}>{pendingEmail}</strong>. It expires in 15 minutes.</p>
        </div>
        <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>
              Verification code
              <input type="text" inputMode="numeric" pattern="[0-9]{6}" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required autoComplete="one-time-code" placeholder="000000" style={{ ...inputStyle, fontSize: '1.25rem', letterSpacing: '0.25em', textAlign: 'center' }} autoFocus />
            </label>
            {verifyError && <FieldError message={verifyError} />}
          </div>
          <button type="submit" disabled={verifyLoading || code.length !== 6} style={{ padding: '0.675rem', backgroundColor: verifyLoading || code.length !== 6 ? '#93c5fd' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.875rem', cursor: verifyLoading || code.length !== 6 ? 'default' : 'pointer' }}>
            {verifyLoading ? 'Verifying…' : plan === 'starter' ? 'Verify and create account' : 'Verify and continue to payment'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
          Didn&apos;t receive it?{' '}
          <button onClick={() => { setStep('form'); setCode(''); setVerifyError(null) }} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Re-enter your details to resend</button>
        </p>
      </main>
    )
  }

  return (
    <main style={pageWrapperStyle}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#64748b', fontSize: '0.8rem' }}>← Home</Link>
        <h1 style={h1Style}>Create your business account</h1>
        <p style={subtitleStyle}>Set up your SlotFill waitlist in minutes.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#94a3b8' }}>Choose your plan</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {PLANS.map(p => (
              <button
                key={p.key}
                type="button"
                onClick={() => setPlan(p.key)}
                style={{
                  padding: '0.75rem 0.5rem',
                  backgroundColor: plan === p.key ? 'rgba(59,130,246,0.1)' : 'transparent',
                  border: `1px solid ${plan === p.key ? 'rgba(59,130,246,0.5)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '9px',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: plan === p.key ? '#93c5fd' : '#94a3b8' }}>{p.label}</div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc', marginTop: '0.2rem' }}>{formatPrice(p.usdPrice)}</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.1rem' }}>{p.sub}</div>
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Business name
            <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required autoComplete="organization" placeholder="e.g. City Dental, The Hair Studio" maxLength={80} style={inputStyle} />
          </label>
          {error && errorField === 'businessName' && <FieldError message={error} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@]/g, ''))} required autoComplete="email" maxLength={254} style={inputStyle} />
          </label>
          {error && errorField === 'email' && <FieldError message={error} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Password
            <span style={hintTextStyle}>8–72 characters · uppercase &amp; lowercase · at least one number · no spaces</span>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" style={{ ...inputStyle, paddingRight: '4rem' }} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={showPasswordBtnStyle}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          {error && errorField === 'password' && <FieldError message={error} />}
        </div>

        <button type="submit" disabled={loading} style={{ padding: '0.675rem', backgroundColor: loading ? '#93c5fd' : '#3b82f6', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.875rem', cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'Sending code…' : 'Continue'}
        </button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#3b82f6' }}>Log in</Link>
      </p>
    </main>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupPageContent />
    </Suspense>
  )
}
