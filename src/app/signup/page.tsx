'use client'

import { useState, type FormEvent, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  const [demoSuccess, setDemoSuccess] = useState(false)

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
    setDemoSuccess(true)
  }

  if (step === 'payment') {
    if (demoSuccess) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
          <div className="w-full max-w-sm text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-green-500/15 border border-green-500/30 mb-5">
              <span className="text-green-400 text-2xl">✓</span>
            </div>
            <h1 className="text-xl font-semibold text-white mb-2">
              You&apos;re on {selectedPlan.label}
            </h1>
            <p className="text-sm text-slate-400 mb-1">
              Your account has been moved to the {selectedPlan.label} tier.
            </p>
            <p className="text-xs text-amber-400/80 mb-7">
              Demo build — no charges apply.
            </p>
            <Button asChild className="w-full">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </main>
      )
    }

    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <button onClick={() => setStep('form')} className="text-xs text-slate-400 hover:text-slate-200 mb-4">
              ← Start over
            </button>
            <h1 className="text-xl font-semibold text-white">Complete your {selectedPlan.label} subscription</h1>
            <p className="text-sm text-slate-400 mt-1">You&apos;re almost there — enter your payment details below.</p>
          </div>

          <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center bg-blue-500/5 border border-blue-500/20 rounded-lg px-4 py-3">
              <div>
                <div className="text-sm font-semibold text-white">{selectedPlan.label} plan</div>
                <div className="text-xs text-slate-500 mt-0.5">Billed monthly · cancel anytime</div>
              </div>
              <div className="text-blue-400 font-bold">{formatPrice(selectedPlan.usdPrice)}/mo</div>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Cardholder name</Label>
                <Input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} required placeholder="Jane Smith" autoComplete="cc-name" className="bg-[#0f172a] border-white/[0.12] text-white placeholder:text-slate-500" />
              </div>

              <div className="space-y-1.5">
                <Label>Card number</Label>
                <Input
                  type="text" inputMode="numeric" value={cardNumber}
                  onChange={(e) => {
                    const d = e.target.value.replace(/\D/g, '').slice(0, 16)
                    setCardNumber(d.match(/.{1,4}/g)?.join(' ') ?? d)
                  }}
                  required placeholder="1234 5678 9012 3456" autoComplete="cc-number" maxLength={19}
                  className="bg-[#0f172a] border-white/[0.12] text-white placeholder:text-slate-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Expiry</Label>
                  <Input
                    type="text" inputMode="numeric" value={cardExpiry}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
                      setCardExpiry(raw.length > 2 ? raw.slice(0, 2) + '/' + raw.slice(2) : raw)
                    }}
                    required placeholder="MM/YY" autoComplete="cc-exp" maxLength={5}
                    className="bg-[#0f172a] border-white/[0.12] text-white placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>CVV</Label>
                  <Input
                    type="text" inputMode="numeric" value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    required placeholder="123" autoComplete="cc-csc" maxLength={4}
                    className="bg-[#0f172a] border-white/[0.12] text-white placeholder:text-slate-500"
                  />
                </div>
              </div>

              {payError && <FieldError message={payError} />}

              <Button type="submit" disabled={payLoading} className="w-full">
                {payLoading ? 'Processing…' : `Pay ${formatPrice(selectedPlan.usdPrice)}/month`}
              </Button>
            </form>
          </div>

          <p className="mt-3 text-xs text-slate-500 text-center">
            Your card details are encrypted and processed securely.
          </p>
        </div>
      </main>
    )
  } // end step === 'payment'

  if (step === 'verify') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <button onClick={() => setStep('form')} className="text-xs text-slate-400 hover:text-slate-200 mb-4">
              ← Back
            </button>
            <h1 className="text-xl font-semibold text-white">Check your email</h1>
            <p className="text-sm text-slate-400 mt-1">
              We sent a 6-digit code to <strong className="text-white">{pendingEmail}</strong>. It expires in 15 minutes.
            </p>
          </div>

          <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6 space-y-4">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Verification code</Label>
                <Input
                  type="text" inputMode="numeric" pattern="[0-9]{6}" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required autoComplete="one-time-code" placeholder="000000" autoFocus
                  className="bg-[#0f172a] border-white/[0.12] text-white text-center text-xl tracking-widest placeholder:text-slate-500"
                />
                {verifyError && <FieldError message={verifyError} />}
              </div>
              <Button type="submit" disabled={verifyLoading || code.length !== 6} className="w-full">
                {verifyLoading ? 'Verifying…' : plan === 'starter' ? 'Verify and create account' : 'Verify and continue to payment'}
              </Button>
            </form>
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            Didn&apos;t receive it?{' '}
            <button
              onClick={() => { setStep('form'); setCode(''); setVerifyError(null) }}
              className="text-blue-400 hover:text-blue-300"
            >
              Re-enter your details to resend
            </button>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <span className="text-blue-400 font-bold text-lg">S</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Create your business account</h1>
          <p className="text-sm text-slate-400 mt-1">Set up your SlotFill waitlist in minutes.</p>
        </div>

        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-300">Choose your plan</div>
              <div className="grid grid-cols-3 gap-2">
                {PLANS.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlan(p.key)}
                    className={`py-3 px-2 rounded-lg border text-center transition-colors ${
                      plan === p.key
                        ? 'bg-blue-500/10 border-blue-500/50'
                        : 'bg-transparent border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className={`font-semibold text-xs ${plan === p.key ? 'text-blue-300' : 'text-slate-400'}`}>{p.label}</div>
                    <div className="font-bold text-sm text-white mt-0.5">{formatPrice(p.usdPrice)}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Business name</Label>
              <Input
                type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)}
                required autoComplete="organization" placeholder="e.g. City Dental, The Hair Studio" maxLength={80}
                className="bg-[#0f172a] border-white/[0.12] text-white placeholder:text-slate-500"
              />
              {error && errorField === 'businessName' && <FieldError message={error} />}
            </div>

            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email" value={email}
                onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@]/g, ''))}
                required autoComplete="email" maxLength={254}
                className="bg-[#0f172a] border-white/[0.12] text-white"
              />
              {error && errorField === 'email' && <FieldError message={error} />}
            </div>

            <div className="space-y-1.5">
              <Label>Password</Label>
              <p className="text-xs text-slate-500">8–72 characters · uppercase &amp; lowercase · at least one number · no spaces</p>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required minLength={8} autoComplete="new-password"
                  className="bg-[#0f172a] border-white/[0.12] text-white pr-16"
                />
                <button
                  type="button" onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {error && errorField === 'password' && <FieldError message={error} />}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending code…' : 'Continue'}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-xs text-slate-500 text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300">Log in</Link>
        </p>
      </div>
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
