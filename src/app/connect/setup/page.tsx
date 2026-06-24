import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { decrypt } from '@/lib/crypto/encrypt'
import ConnectSetupForm from './connect-setup-form'

export default async function ConnectSetupPage() {
  const cookieStore = await cookies()
  const pending = cookieStore.get('pending_connect')
  if (!pending) {
    redirect('/connect?error=expired')
  }

  const { calendars } = JSON.parse(decrypt(pending.value)) as {
    calendars: { id: string; summary: string; timezone: string }[]
  }

  return <ConnectSetupForm calendars={calendars} />
}
