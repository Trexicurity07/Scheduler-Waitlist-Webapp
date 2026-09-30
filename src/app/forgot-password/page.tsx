'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function detectConfirmField(msg: string): 'password' | 'code' {
  const m = msg.toLowerCase()
  if (m.includes('code') || m.includes('attempt') || m.includes('expired') || m.includes('wrong')) return 'code'
  return 'password'
}

function PageBg() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(rgba(148,163,184,0.05) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full opacity-15 blur-3xl"
        style={{ background: 'radial-gradient(circle, #818cf8, transparent 70%)' }}
      />
    </div>
  )
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [step, setStep] = useState<'request' | 'confirm'>('request')
  const [email, setEmail] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'password' | 'code'>('code')
  const [loading, setLoading] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle')

  async function requestCode(addr: string): Promise<{ maskedEmail: string; sessionToken: string } | null> {
    const res = await fetch('/api/owner/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: addr }),
    })
    const data = await res.json() as { maskedEmail?: string; sessionToken?: string }
    if (!res.ok) return null
    return { maskedEmail: data.maskedEmail ?? '', sessionToken: data.sessionToken ?? '' }
  }

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const result = await requestCode(email)
    setLoading(false)
    if (!result) { setError('Something went wrong.'); return }
    setMaskedEmail(result.maskedEmail)
    setSessionToken(result.sessionToken)
    setStep('confirm')
  }

  async function handleResend() {
    setResendStatus('sending')
    setError(null)
    setCode('')
    const result = await requestCode(email)
    if (!result) { setResendStatus('idle'); return }
    setSessionToken(result.sessionToken)
    setResendStatus('sent')
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/owner/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken, code, newPassword }),
    })
    const data = await res.json() as { ok?: boolean; error?: string }
    setLoading(false)
    if (!res.ok) {
      const msg = data.error ?? 'Something went wrong.'
      setError(msg); setErrorField(detectConfirmField(msg)); return
    }
    router.push('/')
  }

  if (step === 'request') {
    return (
      <main className="relative min-h-screen flex items-center justify-center bg-[#090e1a] px-4 py-10">
        <PageBg />
        <div className="relative z-10 w-full max-w-sm">
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10">
              <span className="text-lg font-bold text-blue-400">S</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm text-slate-400">Enter your email and we&apos;ll send you a reset code.</p>
          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm space-y-4">
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email" value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@]/g, ''))}
                  required autoComplete="email" maxLength={254}
                  className="bg-[#0f172a] border-white/[0.12] text-white"
                />
                {error && <FieldError message={error} />}
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending…' : 'Send reset code'}
              </Button>
            </form>
          </div>

          <p className="mt-4 text-xs text-slate-500 text-center">
            <Link href="/login" className="text-blue-400 hover:text-blue-300">← Back to login</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen flex items-center justify-center bg-[#090e1a] px-4 py-10">
      <PageBg />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6">
          <button
            onClick={() => { setStep('request'); setError(null); setCode(''); setNewPassword('') }}
            className="mb-4 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Try a different email
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
            Enter your reset code
          </h1>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
            If <strong className="text-white">{maskedEmail}</strong> is registered, we&apos;ve sent an 8-digit code.
            Check your inbox and spam folder. The code expires in 15 minutes.
          </p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm space-y-4">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label>New password</Label>
              <p className="text-xs text-slate-500">8–72 characters · uppercase &amp; lowercase · at least one number · no spaces</p>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <div className="space-y-1.5">
              <Label>Reset code</Label>
              <Input
                type="text" inputMode="numeric" value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                required placeholder="12345678" maxLength={8}
                className="bg-[#0f172a] border-white/[0.12] text-white tracking-widest text-lg"
              />
              {error && errorField === 'code' && <FieldError message={error} />}
            </div>

            <Button type="submit" disabled={loading || code.length !== 8} className="w-full">
              {loading ? 'Resetting…' : 'Set new password'}
            </Button>

            <Button
              type="button" variant="outline" onClick={handleResend}
              disabled={resendStatus === 'sending'}
              className={`w-full border-white/[0.12] bg-transparent ${resendStatus === 'sent' ? 'text-green-400' : 'text-slate-400'} hover:text-white`}
            >
              {resendStatus === 'sending' ? 'Sending…' : resendStatus === 'sent' ? 'New code sent — check your inbox' : 'Request new code'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
