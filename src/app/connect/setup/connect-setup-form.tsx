'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { inputStyle, labelStyle, pageWrapperStyle, h1Style, subtitleStyle, errorAlertStyle, hintTextStyle, colors } from '@/lib/ui/theme'

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
    <main style={{ ...pageWrapperStyle, maxWidth: '480px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={h1Style}>Connect your calendar</h1>
        <p style={subtitleStyle}>Choose which calendar holds your client bookings and fill in your business details.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: colors.textLabel, marginBottom: '0.625rem' }}>
            Which calendar holds client bookings?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {calendars.map((cal) => (
              <label key={cal.id} style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
                <input type="radio" name="calendar" value={cal.id} checked={calendarChoice === cal.id} onChange={() => setCalendarChoice(cal.id)} style={{ accentColor: colors.accent, width: 'auto' }} />
                <span style={{ fontSize: '0.875rem', color: colors.textPrimary }}>{cal.summary}</span>
                <span style={{ fontSize: '0.75rem', color: colors.textMuted }}>{cal.timezone}</span>
              </label>
            ))}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer' }}>
              <input type="radio" name="calendar" value="new" checked={calendarChoice === 'new'} onChange={() => setCalendarChoice('new')} style={{ accentColor: colors.accent, width: 'auto' }} />
              <span style={{ fontSize: '0.875rem', color: colors.textPrimary }}>Create a new calendar</span>
            </label>
            {calendarChoice === 'new' && (
              <input type="text" value={newCalendarName} onChange={(e) => setNewCalendarName(e.target.value)} placeholder="Calendar name" style={{ ...inputStyle, marginTop: '0.25rem' }} />
            )}
          </div>
        </div>

        <label style={labelStyle}>
          Business name
          <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required style={inputStyle} />
        </label>

        <label style={labelStyle}>
          Business type
          <span style={hintTextStyle}>e.g. Hair Salon, Dental Clinic</span>
          <input type="text" name="business_type" value={businessType} onChange={(e) => setBusinessType(e.target.value)} required style={inputStyle} />
        </label>

        <label style={labelStyle}>
          WhatsApp number
          <span style={hintTextStyle}>With country code, e.g. +15551234567</span>
          <input type="tel" value={whatsappNumber} onChange={(e) => setWhatsappNumber(e.target.value)} required style={inputStyle} />
        </label>

        {error && <p role="alert" style={errorAlertStyle}>{error}</p>}

        <button type="submit" disabled={loading} style={{
          padding: '0.675rem', backgroundColor: loading ? '#93c5fd' : colors.accent,
          color: '#fff', border: 'none', borderRadius: '7px',
          fontWeight: 600, fontSize: '0.875rem', cursor: loading ? 'default' : 'pointer',
        }}>
          {loading ? 'Finishing setup…' : 'Finish setup'}
        </button>
      </form>
    </main>
  )
}
