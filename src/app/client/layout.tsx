import ClientNav from './client-nav'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <ClientNav />
      <div style={{ flex: 1, padding: '2rem', maxWidth: '900px', width: '100%', margin: '0 auto' }}>
        {children}
      </div>
    </div>
  )
}
