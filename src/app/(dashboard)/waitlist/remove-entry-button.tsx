'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function RemoveEntryButton({ entryId }: { entryId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleRemove() {
    setPending(true)
    await fetch(`/api/dashboard/waitlist/${entryId}`, { method: 'DELETE' })
    setPending(false)
    router.refresh()
  }

  return (
    <button
      onClick={handleRemove}
      disabled={pending}
      style={{
        padding: '0.3rem 0.7rem',
        backgroundColor: 'transparent',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: '5px',
        color: pending ? '#64748b' : '#f87171',
        fontSize: '0.75rem',
        fontWeight: 500,
        cursor: pending ? 'default' : 'pointer',
        flexShrink: 0,
      }}
    >
      {pending ? 'Removing…' : 'Remove'}
    </button>
  )
}
