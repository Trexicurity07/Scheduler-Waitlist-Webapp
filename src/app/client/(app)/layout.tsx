import ClientNav from './client-nav'

export default function ClientAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <ClientNav />
      <div style={{ flex: 1, padding: '2.5rem 1.5rem', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
        {children}
      </div>
    </div>
  )
}
