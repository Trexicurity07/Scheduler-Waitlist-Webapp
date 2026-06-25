'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const body = await response.json()

    if (!response.ok || !body.ok) {
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }
    router.push('/connect/setup')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Create your account</h1>
      <label>
        Email
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      {error && <p role="alert">{error}</p>}
      <button type="submit">Sign up</button>
    </form>
  )
}
