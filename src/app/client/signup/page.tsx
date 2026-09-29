'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FieldError } from '@/components/field-error'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function detectField(msg: string): 'name' | 'email' | 'phone' | 'password' | 'general' {
  const m = msg.toLowerCase()
  if (m.includes('email')) return 'email'
  if (m.includes('phone')) return 'phone'
  if (m.includes('password') || m.includes('upper') || m.includes('lower') ||
      m.includes('digit') || m.includes('number') || m.includes('72') || m.includes('space')) return 'password'
  if (m.includes('name')) return 'name'
  return 'general'
}

export default function ClientSignupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'verify'>('form')
  const [pendingEmail, setPendingEmail] = useState('')

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'name' | 'email' | 'phone' | 'password' | 'general'>('general')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const [code, setCode] = useState('')
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifyLoading, setVerifyLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/client/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const data: unknown = await res.json()
    setLoading(false)
    if (!res.ok) {
      const msg = (data as { error?: string }).error ?? 'Signup failed.'
      setError(msg); setErrorField(detectField(msg)); return
    }
    setPendingEmail(form.email.toLowerCase())
    setStep('verify')
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    setVerifyError(null)
    setVerifyLoading(true)
    const res = await fetch('/api/client/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: pendingEmail, code }) })
    const data: unknown = await res.json()
    setVerifyLoading(false)
    if (!res.ok) { setVerifyError((data as { error?: string }).error ?? 'Something went wrong.'); return }
    router.push('/about')
  }

  if (step === 'verify') {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <button
              onClick={() => setStep('form')}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-4 block mx-auto"
            >
              ← Back
            </button>
            <h1 className="text-xl font-semibold text-white">Check your email</h1>
            <p className="text-sm text-slate-400 mt-1">
              We sent a 6-digit code to <strong className="text-white">{pendingEmail}</strong>. It expires in 15 minutes.
            </p>
          </div>
          <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="code">Verification code</Label>
                <Input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoComplete="one-time-code"
                  placeholder="000000"
                  className="text-xl tracking-[0.25em] text-center font-mono"
                  autoFocus
                />
                {verifyError && <FieldError message={verifyError} />}
              </div>
              <Button type="submit" disabled={verifyLoading || code.length !== 6} className="w-full">
                {verifyLoading ? 'Verifying…' : 'Verify and create account'}
              </Button>
            </form>
          </div>
          <p className="mt-4 text-xs text-slate-500 text-center">
            Didn&apos;t receive it?{' '}
            <button
              onClick={() => { setStep('form'); setCode(''); setVerifyError(null) }}
              className="text-sky-400 hover:text-sky-300 transition-colors"
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
          <h1 className="text-xl font-semibold text-white">Create a client account</h1>
          <p className="text-sm text-slate-400 mt-1">Get notified when a cancellation slot opens up.</p>
        </div>

        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                autoComplete="name"
                maxLength={60}
              />
              {error && errorField === 'name' && <FieldError message={error} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value.replace(/[^a-zA-Z0-9.@]/g, '') })}
                required
                autoComplete="email"
                maxLength={254}
              />
              {error && errorField === 'email' && <FieldError message={error} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">
                Phone
                <span className="text-xs text-slate-500 font-normal ml-1">e.g. +15551234567</span>
              </Label>
              <Input
                id="phone"
                type="tel"
                value={form.phone}
                onChange={(e) => {
                  const v = e.target.value
                  const hasPlus = v.startsWith('+')
                  const digits = v.replace(/\D/g, '').slice(0, 15)
                  setForm({ ...form, phone: (hasPlus ? '+' : '') + digits })
                }}
                required
                autoComplete="tel"
                placeholder="+15551234567"
                maxLength={16}
              />
              {error && errorField === 'phone' && <FieldError message={error} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                Password
                <span className="text-xs text-slate-500 font-normal ml-1">8–72 chars, upper &amp; lower, digit, no spaces</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {error && errorField === 'password' && <FieldError message={error} />}
            </div>

            {error && errorField === 'general' && <FieldError message={error} />}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Sending code…' : 'Continue'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-xs text-slate-500 text-center">
          Already have an account?{' '}
          <Link href="/client/login" className="text-sky-400 hover:text-sky-300 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
