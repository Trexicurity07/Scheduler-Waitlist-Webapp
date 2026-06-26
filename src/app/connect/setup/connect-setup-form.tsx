'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'

interface CalendarOption {
  id: string
  summary: string
  timezone: string
}

export default function ConnectSetupForm({ calendars }: { calendars: CalendarOption[] }) {
  const [calendarChoice, setCalendarChoice] = useState<string>(calendars[0]?.id ?? 'new')
  const [newCalendarName, setNewCalendarName] = useState('Client Bookings')
  const [businessName, setBusinessName] = useState('')
  const [businessType, setBusinessType] = useState('')
  const [whatsappNumber, setWhatsappNumber] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)

    const body =
      calendarChoice === 'new'
        ? { createNewCalendar: true, newCalendarName, businessName, businessType, whatsappNumber }
        : { createNewCalendar: false, calendarId: calendarChoice, businessName, businessType, whatsappNumber }

    const response = await fetch('/api/connect/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const data = await response.json()
      setError(data.error ?? 'Something went wrong')
      return
    }

    router.push('/dashboard')
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Connect your calendar</h1>

      <fieldset>
        <legend>Which calendar holds client bookings?</legend>
        {calendars.map((cal) => (
          <label key={cal.id}>
            <input
              type="radio"
              name="calendar"
              value={cal.id}
              checked={calendarChoice === cal.id}
              onChange={() => setCalendarChoice(cal.id)}
            />
            {cal.summary}
          </label>
        ))}
        <label>
          <input
            type="radio"
            name="calendar"
            value="new"
            checked={calendarChoice === 'new'}
            onChange={() => setCalendarChoice('new')}
          />
          Create a new calendar
        </label>
        {calendarChoice === 'new' && (
          <input
            type="text"
            value={newCalendarName}
            onChange={(e) => setNewCalendarName(e.target.value)}
            placeholder="Calendar name"
          />
        )}
      </fieldset>

      <label>
        Business name
        <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
      </label>

      <label>
        Business type (e.g. Hair Salon, Dental Clinic)
        <input
          type="text"
          name="business_type"
          value={businessType}
          onChange={(e) => setBusinessType(e.target.value)}
          required
        />
      </label>

      <label>
        WhatsApp number (with country code, e.g. +15551234567)
        <input
          type="tel"
          value={whatsappNumber}
          onChange={(e) => setWhatsappNumber(e.target.value)}
          required
        />
      </label>

      {error && <p role="alert">{error}</p>}
      <button type="submit">Finish setup</button>
    </form>
  )
}
