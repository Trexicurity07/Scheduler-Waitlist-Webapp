import ClientNav from './client-nav'

export default function ClientAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0f172a]">
      <ClientNav />
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-10">
        {children}
      </div>
    </div>
  )
}
