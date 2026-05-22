import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import Link from 'next/link'

function HospitalIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

export default async function RumahSakitLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hospital' && profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen" style={{ background: '#f9fafb' }}>
      <header className="sticky top-0 z-40 border-b border-red-100"
        style={{ background: 'white', boxShadow: '0 1px 8px rgba(220,38,38,0.08)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/rumah-sakit/dashboard" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center"
              style={{ boxShadow: '0 2px 8px rgba(220,38,38,0.35)' }}>
              <HospitalIcon size={14} className="text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-display font-bold text-gray-900 text-sm">
                Blood<span className="text-gradient">Connect</span>
              </span>
              <span className="block text-[10px] text-gray-400 font-medium -mt-0.5 tracking-wide">PORTAL RUMAH SAKIT</span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/rumah-sakit/dashboard" id="rs-nav-dashboard"
              className="text-sm font-medium text-gray-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors">
              Dashboard
            </Link>
            <Link href="/permintaan-transfusi" id="rs-nav-form"
              className="text-sm font-semibold text-white px-4 py-1.5 rounded-lg gradient-brand transition-opacity hover:opacity-90"
              style={{ boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}>
              + Permintaan Baru
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{profile?.name ?? 'RS'}</p>
              <p className="text-[11px] text-red-500 font-medium">Rumah Sakit</p>
            </div>
            <form action="/api/v1/auth/logout" method="POST">
              <button type="submit" id="rs-logout-btn"
                className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
