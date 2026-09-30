import Link from 'next/link'
import MarketingNav from './marketing-nav'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0f172a]">
      <MarketingNav />
      <div className="flex-1">{children}</div>
      <footer className="border-t border-white/[0.06] bg-[#080d18] px-10 pb-8 pt-14">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-4">
          <div>
            <div className="mb-2.5 text-base font-bold tracking-tight text-white">SlotFill</div>
            <p className="max-w-[260px] text-sm leading-relaxed text-slate-500">
              Automated cancellation management that keeps your schedule full and your clients happy.
            </p>
          </div>

          <div>
            <div className="mb-3.5 text-xs font-semibold uppercase tracking-widest text-slate-400">Company</div>
            {[['About', '/about'], ['Pricing', '/pricing']].map(([label, href]) => (
              <div key={href} className="mb-2">
                <Link href={href} className="text-sm text-slate-500 hover:text-slate-300">{label}</Link>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-3.5 text-xs font-semibold uppercase tracking-widest text-slate-400">Product</div>
            {[['Business', '/login'], ['Clients', '/client/login']].map(([label, href]) => (
              <div key={href} className="mb-2">
                <Link href={href} className="text-sm text-slate-500 hover:text-slate-300">{label}</Link>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-3.5 text-xs font-semibold uppercase tracking-widest text-slate-400">Contact</div>
            <p className="mb-1.5 text-sm text-slate-500">hello@example.com</p>
            <p className="mb-1.5 text-sm text-slate-500">+1 (555) 000-0000</p>
            <p className="text-sm leading-relaxed text-slate-500">
              123 Placeholder Street<br />Demo City, DC 00000
            </p>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-6xl items-center justify-between border-t border-white/[0.06] pt-6">
          <span className="text-xs text-slate-600">© 2026 [Company Name] — Demo build</span>
          <span className="text-xs text-slate-600">Made for service businesses everywhere.</span>
        </div>
      </footer>
    </div>
  )
}
