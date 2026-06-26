import OwnerNav from './owner-nav'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
      <OwnerNav />
      <div style={{ flex: 1, minWidth: 0, padding: '2rem', overflowY: 'auto' as const }}>
        {children}
      </div>
    </div>
  )
}
