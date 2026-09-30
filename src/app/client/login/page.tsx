'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { FieldError } from '@/components/field-error'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

function detectField(msg: string): 'identifier' | 'password' {
  const m = msg.toLowerCase()
  if (m.includes('account') || m.includes('multiple') || m.includes('verify')) return 'identifier'
  return 'password'
}

export default function ClientLoginPage() {
  return (
    <Suspense>
      <ClientLoginForm />
    </Suspense>
  )
}

function ClientLoginForm() {
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
    <main className="relative min-h-screen flex items-center justify-center bg-[#090e1a] px-4 py-10">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,0.05) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div
          className="absolute -top-40 left-1/2 h-[500px] w-[500px] -translate-x-1/2 rounded-full opacity-15 blur-3xl"
          style={{ background: 'radial-gradient(circle, #22d3ee, transparent 70%)' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10">
            <span className="text-lg font-bold text-sky-400">S</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white" style={{ letterSpacing: '-0.02em' }}>
            Client login
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">Sign in to view your waitlists and slot offers.</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 backdrop-blur-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email, phone, or name</Label>
              <Input
                id="identifier"
                type="text"
                value={form.identifier}
                onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                required
                autoComplete="username"
                placeholder="Email, phone, or your name"
                maxLength={254}
                className="bg-[#0f172a] border-white/[0.12] text-white placeholder:text-slate-500"
              />
              {error && errorField === 'identifier' && <FieldError message={error} />}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  autoComplete="current-password"
                  className="bg-[#0f172a] border-white/[0.12] text-white pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              {error && errorField === 'password' && <FieldError message={error} />}
            </div>

            <div className="text-right -mt-1">
              <Link
                href="/client/forgot-password"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Signing in…' : 'Log in'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-xs text-slate-500 text-center">
          No account?{' '}
          <Link href="/client/signup" className="text-sky-400 hover:text-sky-300 transition-colors">
            Sign up
          </Link>
        </p>
        <p className="mt-2 text-xs text-slate-600 text-center">
          <Link href="/" className="hover:text-slate-400 transition-colors">← Home</Link>
        </p>
      </div>
    </main>
  )
}
