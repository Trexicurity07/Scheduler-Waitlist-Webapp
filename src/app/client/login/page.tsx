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
    <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <span className="text-blue-400 font-bold text-lg">S</span>
          </div>
          <h1 className="text-xl font-semibold text-white">Client login</h1>
          <p className="text-sm text-slate-400 mt-1">Sign in to view your waitlists and slot offers.</p>
        </div>

        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6">
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
                  className="pr-16"
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
              <Link href="/client/forgot-password" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
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
