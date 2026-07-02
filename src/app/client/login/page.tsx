'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FieldError } from '@/components/field-error'
import { inputStyle, labelStyle, pageWrapperStyle, h1Style, subtitleStyle, showPasswordBtnStyle } from '@/lib/ui/theme'

function detectField(msg: string): 'identifier' | 'password' {
  const m = msg.toLowerCase()
  if (m.includes('account') || m.includes('multiple') || m.includes('verify')) return 'identifier'
  return 'password'
}

export default function ClientLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [errorField, setErrorField] = useState<'identifier' | 'password'>('password')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data: unknown = await res.json()
    setLoading(false)
    if (!res.ok) {
      const msg = (data as { error?: string }).error ?? 'Login failed.'
      setError(msg)
      setErrorField(detectField(msg))
      return
    }
    const next = searchParams.get('next') ?? '/client/dashboard'
    router.push(next)
  }

  return (
    <main style={pageWrapperStyle}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#64748b', fontSize: '0.8rem' }}>← Home</Link>
        <h1 style={h1Style}>Client login</h1>
        <p style={subtitleStyle}>Sign in to view your waitlists and slot offers.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Email, phone, or name
            <input
              type="text"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              required
              autoComplete="username"
              placeholder="Email, phone, or your name"
              maxLength={254}
              style={inputStyle}
            />
          </label>
          {error && errorField === 'identifier' && <FieldError message={error} />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Password
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: '4rem' }}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={showPasswordBtnStyle}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          {error && errorField === 'password' && <FieldError message={error} />}
        </div>

        <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
          <Link href="/client/forgot-password" style={{ color: '#64748b', fontSize: '0.8rem' }}>Forgot password?</Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.675rem',
            backgroundColor: loading ? '#7dd3fc' : '#0ea5e9',
            color: '#fff', border: 'none', borderRadius: '7px',
            fontWeight: 600, fontSize: '0.875rem', cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
        No account?{' '}
        <Link href="/client/signup" style={{ color: '#0ea5e9' }}>Sign up</Link>
      </p>
    </main>
  )
}
