'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FieldError } from '@/components/field-error'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function detectConfirmField(msg: string): 'password' | 'code' {
  const m = msg.toLowerCase()
  if (m.includes('code') || m.includes('attempt') || m.includes('expired') || m.includes('wrong')) return 'code'
  return 'password'
}

export default function ClientForgotPasswordPage() {
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
    const res = await fetch('/api/client/forgot-password', {
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
    const res = await fetch('/api/client/reset-password', {
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
      <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <h1 className="text-xl font-semibold text-white">Reset your password</h1>
            <p className="text-sm text-slate-400 mt-1">
              Enter the email on your client account. If it&apos;s registered, we&apos;ll send an 8-digit code.
            </p>
          </div>
          <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6">
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@]/g, ''))}
                  required
                  autoComplete="email"
                  maxLength={254}
                />
                {error && <FieldError message={error} />}
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Sending…' : 'Send reset code'}
              </Button>
            </form>
          </div>
          <p className="mt-4 text-xs text-slate-600 text-center">
            <Link href="/client/login" className="hover:text-slate-400 transition-colors">← Back to login</Link>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <button
            onClick={() => { setStep('request'); setError(null); setCode(''); setNewPassword('') }}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-4 block mx-auto"
          >
            ← Try a different email
          </button>
          <h1 className="text-xl font-semibold text-white">Enter your reset code</h1>
          <p className="text-sm text-slate-400 mt-1 leading-relaxed">
            If <strong className="text-white">{maskedEmail}</strong> is registered, we&apos;ve sent an 8-digit code.
            Check your inbox and spam folder. The code expires in 15 minutes.
          </p>
        </div>

        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6">
          <form onSubmit={handleReset} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="newPassword">
                New password
                <span className="text-xs text-slate-500 font-normal ml-1">8–72 chars, upper &amp; lower, digit, no spaces</span>
              </Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <div className="space-y-1.5">
              <Label htmlFor="code">Reset code</Label>
              <Input
                id="code"
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
                required
                placeholder="12345678"
                maxLength={8}
                className="tracking-[0.25em] text-lg font-mono"
              />
              {error && errorField === 'code' && <FieldError message={error} />}
            </div>

            <Button type="submit" disabled={loading || code.length !== 8} className="w-full">
              {loading ? 'Resetting…' : 'Set new password'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleResend}
              disabled={resendStatus === 'sending'}
              className={`w-full ${resendStatus === 'sent' ? 'text-green-400 border-green-500/30' : ''}`}
            >
              {resendStatus === 'sending' ? 'Sending…' : resendStatus === 'sent' ? 'New code sent — check your inbox' : 'Request new code'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
