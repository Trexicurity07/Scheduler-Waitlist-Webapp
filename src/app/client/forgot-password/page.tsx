'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FieldError } from '@/components/field-error'
import { inputStyle, labelStyle, pageWrapperStyle, h1Style, subtitleStyle, showPasswordBtnStyle, hintTextStyle } from '@/lib/ui/theme'

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
      <main style={pageWrapperStyle}>
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/client/login" style={{ color: '#64748b', fontSize: '0.8rem' }}>← Back to login</Link>
          <h1 style={h1Style}>Reset your password</h1>
          <p style={subtitleStyle}>Enter the email on your client account. If it&apos;s registered, we&apos;ll send an 8-digit code.</p>
        </div>
        <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@]/g, ''))} required autoComplete="email" maxLength={254} style={inputStyle} />
            </label>
            {error && <FieldError message={error} />}
          </div>
          <button type="submit" disabled={loading} style={{ padding: '0.675rem', backgroundColor: loading ? '#7dd3fc' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.875rem', cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main style={pageWrapperStyle}>
      <div style={{ marginBottom: '2rem' }}>
        <button onClick={() => { setStep('request'); setError(null); setCode(''); setNewPassword('') }} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>
          ← Try a different email
        </button>
        <h1 style={h1Style}>Enter your reset code</h1>
        <p style={{ ...subtitleStyle, lineHeight: 1.6 }}>
          If <strong>{maskedEmail}</strong> is registered, we&apos;ve sent an 8-digit code. Check your inbox and spam folder, then enter your new password and code below. The code expires in 15 minutes and can only be used once.
        </p>
      </div>

      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            New password
            <span style={hintTextStyle}>8–72 characters · uppercase &amp; lowercase · at least one number · no spaces</span>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} autoComplete="new-password" style={{ ...inputStyle, paddingRight: '4rem' }} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={showPasswordBtnStyle}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          {error && errorField === 'password' && <FieldError message={error} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Reset code
            <input type="text" inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))} required placeholder="12345678" maxLength={8} style={{ ...inputStyle, letterSpacing: '0.25em', fontSize: '1.1rem' }} />
          </label>
          {error && errorField === 'code' && <FieldError message={error} />}
        </div>

        <button type="submit" disabled={loading || code.length !== 8} style={{ padding: '0.675rem', backgroundColor: loading || code.length !== 8 ? '#7dd3fc' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.875rem', cursor: loading || code.length !== 8 ? 'default' : 'pointer' }}>
          {loading ? 'Resetting…' : 'Set new password'}
        </button>

        <button type="button" onClick={handleResend} disabled={resendStatus === 'sending'} style={{ padding: '0.675rem', backgroundColor: 'transparent', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '7px', color: resendStatus === 'sent' ? '#86efac' : '#94a3b8', fontWeight: 500, fontSize: '0.875rem', cursor: resendStatus === 'sending' ? 'default' : 'pointer' }}>
          {resendStatus === 'sending' ? 'Sending…' : resendStatus === 'sent' ? 'New code sent — check your inbox' : 'Request new code'}
        </button>
      </form>
    </main>
  )
}
