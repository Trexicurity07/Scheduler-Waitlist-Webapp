'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

interface WaitlistConfig {
  batch_size: number
  batch_interval_minutes: number
  min_notice_hours: number
  min_confirm_lead_hours: number
  timezone: string
}

interface Props {
  waitlistId: string
  waitlist: WaitlistConfig
}

export function SettingsForm({ waitlistId, waitlist }: Props) {
  const router = useRouter()
  const [batchSize, setBatchSize] = useState(waitlist.batch_size)
  const [batchIntervalMinutes, setBatchIntervalMinutes] = useState(waitlist.batch_interval_minutes)
  const [minNoticeHours, setMinNoticeHours] = useState(waitlist.min_notice_hours)
  const [minConfirmLeadHours, setMinConfirmLeadHours] = useState(waitlist.min_confirm_lead_hours)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'saved' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (minConfirmLeadHours >= minNoticeHours) {
      setError('Confirmation lead time must be less than the minimum notice period.')
      setStatus('error')
      return
    }
    setStatus('submitting')
    const response = await fetch(`/api/dashboard/waitlists/${waitlistId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ batchSize, batchIntervalMinutes, minNoticeHours, minConfirmLeadHours }),
    })
    const body = await response.json()
    if (!response.ok || !body.ok) {
      setStatus('error')
      setError(body.error ?? 'Something went wrong. Please try again.')
      return
    }
    setStatus('saved')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3.5">
      <div className="flex flex-col gap-1.5">
        <Label className="text-slate-300">Batch size</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={batchSize}
            onChange={(e) => setBatchSize(Number(e.target.value))}
            required
            className="bg-[#0f172a] border-white/[0.12] text-white"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">offers / round</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-slate-300">Batch interval</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={batchIntervalMinutes}
            onChange={(e) => setBatchIntervalMinutes(Number(e.target.value))}
            required
            className="bg-[#0f172a] border-white/[0.12] text-white"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">min</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-slate-300">Minimum notice</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            value={minNoticeHours}
            onChange={(e) => setMinNoticeHours(Number(e.target.value))}
            required
            className="bg-[#0f172a] border-white/[0.12] text-white"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">hrs</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label className="text-slate-300">Confirm lead time</Label>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={0}
            value={minConfirmLeadHours}
            onChange={(e) => setMinConfirmLeadHours(Number(e.target.value))}
            required
            className="bg-[#0f172a] border-white/[0.12] text-white"
          />
          <span className="text-xs text-slate-500 whitespace-nowrap">hrs</span>
        </div>
      </div>

      <div className="col-span-2 flex items-center gap-3 mt-1">
        <Button type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? 'Saving…' : 'Save settings'}
        </Button>
        {status === 'saved' && (
          <span className="text-xs text-green-400 font-medium">Saved</span>
        )}
        {error && (
          <span role="alert" className="text-xs text-red-400">{error}</span>
        )}
      </div>
    </form>
  )
}
