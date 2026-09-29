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
      className="px-2.5 py-1 text-xs font-medium rounded-md border border-red-500/30 text-red-400 hover:border-red-500/50 hover:text-red-300 disabled:text-slate-500 disabled:border-slate-700 disabled:cursor-default transition-colors bg-transparent cursor-pointer shrink-0"
    >
      {pending ? 'Removing…' : 'Remove'}
    </button>
  )
}
