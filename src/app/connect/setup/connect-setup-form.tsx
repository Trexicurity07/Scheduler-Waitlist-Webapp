'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CalendarOption {
  id: string
  summary: string
  timezone: string
}

export default function ConnectSetupForm({
  calendars,
  defaultBusinessName = '',
}: {
  calendars: CalendarOption[]
  defaultBusinessName?: string
}) {
  const [calendarChoice, setCalendarChoice] = useState<string>(calendars[0]?.id ?? 'new')
  const [newCalendarName, setNewCalendarName] = useState('Client Bookings')
  const [businessName, setBusinessName] = useState(defaultBusinessName)
  const [businessType, setBusinessType] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const body =
      calendarChoice === 'new'
        ? { createNewCalendar: true, newCalendarName, businessName, businessType, whatsappNumber }
        : { createNewCalendar: false, calendarId: calendarChoice, businessName, businessType, whatsappNumber }
    const response = await fetch('/api/connect/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setLoading(false)
    if (!response.ok) {
      const data = await response.json()
      setError(data.error ?? 'Something went wrong')
      return
    }
    router.push('/dashboard')
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0f172a] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Connect your calendar</h1>
          <p className="text-sm text-slate-400 mt-1">
            Choose which calendar holds your client bookings and fill in your business details.
          </p>
        </div>

        <div className="bg-[#1e293b] border border-white/[0.08] rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label>Which calendar holds client bookings?</Label>
              <div className="space-y-2">
                {calendars.map((cal) => (
                  <label
                    key={cal.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      calendarChoice === cal.id
                        ? 'bg-blue-500/10 border-blue-500/40'
                        : 'bg-[#0f172a] border-white/[0.08] hover:border-white/20'
                    }`}
                  >
                    <input
                      type="radio" name="calendar" value={cal.id}
                      checked={calendarChoice === cal.id}
                      onChange={() => setCalendarChoice(cal.id)}
                      className="accent-blue-500"
                    />
                    <div>
                      <div className="text-sm text-white font-medium">{cal.summary}</div>
                      <div className="text-xs text-slate-500">{cal.timezone}</div>
                    </div>
                  </label>
                ))}
                <label
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    calendarChoice === 'new'
                      ? 'bg-blue-500/10 border-blue-500/40'
                      : 'bg-[#0f172a] border-white/[0.08] hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio" name="calendar" value="new"
                    checked={calendarChoice === 'new'}
                    onChange={() => setCalendarChoice('new')}
                    className="accent-blue-500"
                  />
                  <span className="text-sm text-white">Create a new calendar</span>
                </label>
                {calendarChoice === 'new' && (
                  <Input
                    type="text" value={newCalendarName}
                    onChange={(e) => setNewCalendarName(e.target.value)}
                    placeholder="Calendar name"
                    className="bg-[#0f172a] border-white/[0.12] text-white"
                  />
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Business name</Label>
              <Input
                type="text" value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="bg-[#0f172a] border-white/[0.12] text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Business type</Label>
              <p className="text-xs text-slate-500">e.g. Hair Salon, Dental Clinic</p>
              <Input
                type="text" name="business_type" value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                required
                className="bg-[#0f172a] border-white/[0.12] text-white"
              />
            </div>

            <div className="space-y-1.5">
              <Label>WhatsApp number</Label>
              <p className="text-xs text-slate-500">With country code, e.g. +15551234567</p>
              <Input
                type="tel" value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                required
                className="bg-[#0f172a] border-white/[0.12] text-white"
              />
            </div>

            {error && (
              <div role="alert" className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Finishing setup…' : 'Finish setup'}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
