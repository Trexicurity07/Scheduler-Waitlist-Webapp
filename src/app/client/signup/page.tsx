'use client'

import { useState } from 'react'
import Link from 'next/link'

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

export default function ClientSignupPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/client/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data: unknown = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Signup failed.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main style={{ maxWidth: '400px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check your email</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          We sent a verification link to <strong>{form.email}</strong>. Click it to activate
          your account, then log in.
        </p>
        <Link href="/client/login" style={{
          display: 'inline-block', padding: '0.625rem 1.25rem',
          backgroundColor: '#0ea5e9', color: '#fff', borderRadius: '7px',
          textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
        }}>
          Go to login
        </Link>
      </main>
    )
  }

  return (
    <main style={{ maxWidth: '400px', margin: '6rem auto', padding: '0 1.5rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#64748b', fontSize: '0.8rem', textDecoration: 'none' }}>
          ← Home
        </Link>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: '0.75rem 0 0.25rem' }}>
          Create a client account
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Get notified when a cancellation slot opens up.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={labelStyle}>
          Full name
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoComplete="name"
            maxLength={60}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value.replace(/[^a-zA-Z0-9.@]/g, '') })}
            required
            autoComplete="email"
            maxLength={254}
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Phone
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
            Digits only · optional leading + · e.g. +15551234567
          </span>
          <input
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
            style={inputStyle}
          />
        </label>
        <label style={labelStyle}>
          Password
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
            8–72 characters · uppercase &amp; lowercase · at least one number · no spaces
          </span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
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

        {error && (
          <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', margin: 0 }}>{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.675rem',
            backgroundColor: loading ? '#7dd3fc' : '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: '7px',
            fontWeight: 600,
            fontSize: '0.875rem',
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/client/login" style={{ color: '#0ea5e9', textDecoration: 'none' }}>Log in</Link>
      </p>
    </main>
  )
}
