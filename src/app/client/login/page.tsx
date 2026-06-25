'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

export default function ClientLoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const res = await fetch('/api/client/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data: unknown = await res.json()
    if (!res.ok) {
      setError((data as { error?: string }).error ?? 'Login failed.')
      return
    }
    const next = searchParams.get('next') ?? '/client/dashboard'
    router.push(next)
  }

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Log in to your account</h1>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <label>Email or phone<input value={form.identifier} onChange={(e) => setForm({ ...form, identifier: e.target.value })} required /></label>
        <label>Password<input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <button type="submit">Log in</button>
      </form>
      <p>No account? <a href="/client/signup">Sign up</a></p>
    </main>
  )
}
