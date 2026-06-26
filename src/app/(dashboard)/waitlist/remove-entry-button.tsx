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
    <button onClick={handleRemove} disabled={pending}>
      {pending ? 'Removing…' : 'Remove'}
    </button>
  )
}
