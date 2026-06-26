'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const inputStyle = {
  padding: '0.625rem 0.75rem',
  borderRadius: '6px',
  border: '1px solid #cbd5e1',
  fontSize: '0.875rem',
  width: '100%',
  boxSizing: 'border-box' as const,
}

const labelStyle = {
  display: 'flex' as const,
  flexDirection: 'column' as const,
  gap: '0.375rem',
  fontSize: '0.875rem',
  fontWeight: 500 as const,
  color: '#0f172a',
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
  const [loading, setLoading] = useState(false)

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/client/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    const data = await res.json() as { maskedEmail?: string; sessionToken?: string; error?: string }
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Something went wrong.')
      return
    }
    setMaskedEmail(data.maskedEmail ?? '')
    setSessionToken(data.sessionToken ?? '')
    setStep('confirm')
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
      setError(data.error ?? 'Something went wrong.')
      return
    }
    router.push('/')
  }

  if (step === 'request') {
    return (
      <main style={{ maxWidth: '400px', margin: '6rem auto', padding: '0 1.5rem' }}>
        <div style={{ marginBottom: '2rem' }}>
          <Link href="/client/login" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>
            ← Back to login
          </Link>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0.75rem 0 0.25rem' }}>
            Reset your password
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
            Enter the email on your client account. If it&apos;s registered, we&apos;ll send an 8-digit code.
          </p>
        </div>

        <form onSubmit={handleRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <label style={labelStyle}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/[^a-zA-Z0-9.@]/g, ''))}
              required
              autoComplete="email"
              maxLength={254}
              style={inputStyle}
            />
          </label>
          {error && (
            <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.675rem', backgroundColor: loading ? '#7dd3fc' : '#0ea5e9',
              color: '#fff', border: 'none', borderRadius: '7px',
              fontWeight: 600, fontSize: '0.875rem', cursor: loading ? 'default' : 'pointer',
            }}
          >
            {loading ? 'Sending…' : 'Send reset code'}
          </button>
        </form>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: '400px', margin: '6rem auto', padding: '0 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <button
          onClick={() => { setStep('request'); setError(null); setCode(''); setNewPassword('') }}
          style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}
        >
          ← Try a different email
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0.75rem 0 0.25rem' }}>
          Enter your reset code
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0, lineHeight: 1.6 }}>
          If <strong>{maskedEmail}</strong> is registered, we&apos;ve sent an 8-digit code.
          Check your inbox and spam folder, then enter your new password and code below.
          The code expires in 15 minutes and can only be used once.
        </p>
      </div>

      <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={labelStyle}>
          New password
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
            8–72 characters · uppercase &amp; lowercase · at least one number · no spaces
          </span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              style={{ ...inputStyle, paddingRight: '4rem' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              style={{
                position: 'absolute', right: '0.625rem', top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', color: '#64748b', fontSize: '0.75rem',
                cursor: 'pointer', padding: '0.25rem',
              }}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </label>

        <label style={labelStyle}>
          Reset code
          <input
            type="text"
            inputMode="numeric"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 8))}
            required
            placeholder="12345678"
            maxLength={8}
            style={{ ...inputStyle, letterSpacing: '0.25em', fontSize: '1.1rem' }}
          />
        </label>

        {error && (
          <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 8}
          style={{
            padding: '0.675rem',
            backgroundColor: loading || code.length !== 8 ? '#7dd3fc' : '#0ea5e9',
            color: '#fff', border: 'none', borderRadius: '7px',
            fontWeight: 600, fontSize: '0.875rem',
            cursor: loading || code.length !== 8 ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Resetting…' : 'Set new password'}
        </button>
      </form>
    </main>
  )
}
