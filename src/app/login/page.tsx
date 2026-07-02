'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { FieldError } from '@/components/field-error'
import { inputStyle, labelStyle, pageWrapperStyle, h1Style, subtitleStyle, showPasswordBtnStyle } from '@/lib/ui/theme'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const res = await fetch('/api/owner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const data: unknown = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Login failed.')
      return
    }
    router.push('/dashboard')
  }

  return (
    <main style={pageWrapperStyle}>
      <div style={{ marginBottom: '2rem' }}>
        <Link href="/" style={{ color: '#64748b', fontSize: '0.8rem' }}>← Home</Link>
        <h1 style={h1Style}>Business owner login</h1>
        <p style={subtitleStyle}>Sign in to your SlotFill dashboard.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={labelStyle}>
          Email or business name
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            placeholder="you@example.com or Your Business"
            maxLength={254}
            style={inputStyle}
          />
        </label>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={labelStyle}>
            Password
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ ...inputStyle, paddingRight: '4rem' }}
              />
              <button type="button" onClick={() => setShowPassword((v) => !v)} style={showPasswordBtnStyle}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>
          {error && <FieldError message={error} />}
        </div>

        <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
          <Link href="/forgot-password" style={{ color: '#64748b', fontSize: '0.8rem' }}>Forgot password?</Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.675rem',
            backgroundColor: loading ? '#93c5fd' : '#3b82f6',
            color: '#fff', border: 'none', borderRadius: '7px',
            fontWeight: 600, fontSize: '0.875rem', cursor: loading ? 'default' : 'pointer',
          }}
        >
          {loading ? 'Signing in…' : 'Log in'}
        </button>
      </form>

      <p style={{ marginTop: '1.25rem', fontSize: '0.8rem', color: '#64748b', textAlign: 'center' }}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" style={{ color: '#3b82f6' }}>Create one</Link>
      </p>
    </main>
  )
}
