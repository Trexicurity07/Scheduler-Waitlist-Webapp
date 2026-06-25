'use client'

import { useState } from 'react'

export default function ClientSignupPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/client/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data: unknown = await res.json()
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Signup failed.')
      return
    }
    setSubmitted(true)
  }

  if (submitted) {
    return (
      <main style={{ padding: '2rem' }}>
        <h1>Check your email</h1>
        <p>We sent a verification link to <strong>{form.email}</strong>. Click the link to activate your account.</p>
      </main>
    )
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Create a client account</h1>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <label>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></label>
        <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
        <label>Phone<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button type="submit">Create account</button>
      </form>
      <p>Already have an account? <a href="/client/login">Log in</a></p>
    </main>
  )
}
