'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FieldError } from '@/components/field-error'
import { inputStyle, labelStyle, pageWrapperStyle, h1Style, subtitleStyle, showPasswordBtnStyle, hintTextStyle } from '@/lib/ui/theme'

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
          <button type="submit" disabled={verifyLoading || code.length !== 6} style={{ padding: '0.675rem', backgroundColor: verifyLoading || code.length !== 6 ? '#7dd3fc' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.875rem', cursor: verifyLoading || code.length !== 6 ? 'default' : 'pointer' }}>
            {verifyLoading ? 'Verifying…' : 'Verify and create account'}
          </button>
        </form>
        <p style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
          Didn&apos;t receive it?{' '}
          <button onClick={() => { setStep('form'); setCode(''); setVerifyError(null) }} style={{ background: 'none', border: 'none', color: '#0ea5e9', fontSize: '0.8rem', cursor: 'pointer', padding: 0 }}>Re-enter your details to resend</button>
        </p>
      </main>
    )
  }

  return (
    <main style={pageWrapperStyle}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#64748b', fontSize: '0.8rem' }}>← Home</Link>
        <h1 style={h1Style}>Create a client account</h1>
        <p style={subtitleStyle}>Get notified when a cancellation slot opens up.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Full name<input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoComplete="name" maxLength={60} style={inputStyle} /></label>
          {error && errorField === 'name' && <FieldError message={error} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value.replace(/[^a-zA-Z0-9.@]/g, '') })} required autoComplete="email" maxLength={254} style={inputStyle} /></label>
          {error && errorField === 'email' && <FieldError message={error} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Phone
            <span style={hintTextStyle}>Digits only · optional leading + · e.g. +15551234567</span>
            <input type="tel" value={form.phone} onChange={(e) => { const v = e.target.value; const hasPlus = v.startsWith('+'); const digits = v.replace(/\D/g, '').slice(0, 15); setForm({ ...form, phone: (hasPlus ? '+' : '') + digits }) }} required autoComplete="tel" placeholder="+15551234567" maxLength={16} style={inputStyle} />
          </label>
          {error && errorField === 'phone' && <FieldError message={error} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Password
            <span style={hintTextStyle}>8–72 characters · uppercase &amp; lowercase · at least one number · no spaces</span>
            <div style={{ position: 'relative' }}>
              <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} autoComplete="new-password" style={{ ...inputStyle, paddingRight: '4rem' }} />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={showPasswordBtnStyle}>{showPassword ? 'Hide' : 'Show'}</button>
            </div>
          </label>
          {error && errorField === 'password' && <FieldError message={error} />}
        </div>
        {error && errorField === 'general' && <FieldError message={error} />}
        <button type="submit" disabled={loading} style={{ padding: '0.675rem', backgroundColor: loading ? '#7dd3fc' : '#0ea5e9', color: '#fff', border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.875rem', cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'Sending code…' : 'Continue'}
        </button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/client/login" style={{ color: '#0ea5e9' }}>Log in</Link>
      </p>
    </main>
  )
}
