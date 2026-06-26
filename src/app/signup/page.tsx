'use client'

import { useState, type FormEvent } from 'react'
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

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, businessName }),
    })
    const body = await response.json()

    if (!response.ok || !body.ok) {
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <main style={{ maxWidth: '400px', margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📬</div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>Check your email</h1>
        <p style={{ color: '#64748b', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          We sent a confirmation link to <strong>{email}</strong>. Click it to verify your
          account, then come back here to log in.
        </p>
        <Link href="/" style={{
          display: 'inline-block', padding: '0.625rem 1.25rem',
          backgroundColor: '#3b82f6', color: '#fff', borderRadius: '7px',
          textDecoration: 'none', fontSize: '0.875rem', fontWeight: 600,
        }}>
          Back to home
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
          Create your business account
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
          Set up your SlotFill waitlist in minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={labelStyle}>
          Business name
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            autoComplete="organization"
            placeholder="e.g. City Dental, The Hair Studio"
            maxLength={80}
            style={inputStyle}
          />
        </label>
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
        <label style={labelStyle}>
          Password
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
            8–72 characters · uppercase &amp; lowercase · at least one number · no spaces
          </span>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
        <button type="submit" style={{
          padding: '0.675rem', backgroundColor: '#3b82f6', color: '#fff',
          border: 'none', borderRadius: '7px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
        }}>
          Create account
        </button>
      </form>
      <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
        Already have an account?{' '}
        <Link href="/login" style={{ color: '#3b82f6', textDecoration: 'none' }}>Log in</Link>
      </p>
    </main>
  )
}
