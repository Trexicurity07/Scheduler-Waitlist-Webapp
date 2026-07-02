import Link from 'next/link'
import MarketingNav from './marketing-nav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <MarketingNav />
      <div style={{ flex: 1 }}>{children}</div>
      <footer style={{
        backgroundColor: '#080d18',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        padding: '3.5rem 2.5rem 2rem',
      }}>
        <div style={{
          maxWidth: '1100px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr', gap: '2.5rem',
        }}>
          <div>
            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1.05rem', marginBottom: '0.625rem', letterSpacing: '-0.01em' }}>SlotFill</div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', lineHeight: 1.65, margin: '0 0 1rem', maxWidth: '260px' }}>
              Automated cancellation management that keeps your schedule full and your clients happy.
            </p>
          </div>

          <div>
            <div style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>Company</div>
            {[['About', '/about'], ['Pricing', '/pricing']].map(([label, href]) => (
              <div key={href} style={{ marginBottom: '0.5rem' }}>
                <Link href={href} style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>{label}</Link>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>Product</div>
            {[['Business', '/login'], ['Clients', '/client/login']].map(([label, href]) => (
              <div key={href} style={{ marginBottom: '0.5rem' }}>
                <Link href={href} style={{ color: '#64748b', fontSize: '0.875rem', textDecoration: 'none' }}>{label}</Link>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontWeight: 600, color: '#cbd5e1', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem' }}>Contact</div>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 0.375rem' }}>hello@slotfill.io</p>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 0.375rem' }}>+1 (555) 018-2400</p>
            <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0, lineHeight: 1.55 }}>
              240 Kent Avenue, Suite 4B<br />Brooklyn, NY 11249
            </p>
          </div>
        </div>

        <div style={{
          maxWidth: '1100px', margin: '2.5rem auto 0',
          paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ color: '#475569', fontSize: '0.8rem' }}>© 2026 SlotFill Inc. All rights reserved.</span>
          <span style={{ color: '#475569', fontSize: '0.8rem' }}>Made for service businesses everywhere.</span>
        </div>
      </footer>
    </div>
  )
}
