import { getCurrentBusiness } from '@/lib/dashboard/get-current-business'

export default async function DashboardPage() {
  const { supabase, business } = await getCurrentBusiness()

  const { data: appointments } = await supabase
    .from('appointments')
    .select('id, summary, start_time, end_time')
    .eq('business_id', business.id)
    .eq('status', 'confirmed')
    .gte('start_time', new Date().toISOString())
    .order('start_time', { ascending: true })

  return (
    <main>
      <h1>Upcoming appointments — {business.name}</h1>
      {business.calendar_status === 'disconnected' && (
        <p role="alert">
          Your Google Calendar connection has expired. <a href="/connect">Reconnect it</a> to keep
          auto-filling cancellations.
        </p>
      )}
      {!appointments || appointments.length === 0 ? (
        <p>No upcoming appointments.</p>
      ) : (
        <ul>
          {appointments.map((appointment) => (
            <li key={appointment.id}>
              {new Date(appointment.start_time).toLocaleString()} –{' '}
              {new Date(appointment.end_time).toLocaleString()}
              {appointment.summary ? ` — ${appointment.summary}` : ''}
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
