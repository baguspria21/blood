import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import Link from 'next/link'

function BloodDropIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen" style={{ background: '#f9fafb' }}>
      {/* ── Top Nav ── */}
      <header
        className="sticky top-0 z-40 border-b border-red-100"
        style={{ background: 'white', boxShadow: '0 1px 8px rgba(220,38,38,0.08)' }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center"
              style={{ boxShadow: '0 2px 8px rgba(220,38,38,0.35)' }}
            >
              <BloodDropIcon size={14} className="text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-display font-bold text-gray-900 text-sm">
                Blood<span className="text-gradient">Connect</span>
              </span>
              <span className="block text-[10px] text-gray-400 font-medium -mt-0.5 tracking-wide">
                ADMIN PANEL
              </span>
            </div>
          </Link>

          <nav className="flex items-center gap-1">
            <Link
              href="/admin"
              id="admin-nav-dashboard"
              className="text-sm font-medium text-gray-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/permintaan"
              id="admin-nav-requests"
              className="text-sm font-medium text-gray-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Permintaan
            </Link>
            <Link
              href="/admin/inventaris"
              id="admin-nav-inventory"
              className="text-sm font-medium text-gray-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Stok Darah
            </Link>
            <Link
              href="/admin/donasi"
              id="admin-nav-donations"
              className="text-sm font-medium text-gray-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Donasi
            </Link>
            <Link
              href="/admin/relawan"
              id="admin-nav-volunteers"
              className="text-sm font-medium text-gray-600 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              Relawan
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{profile?.name ?? 'Admin'}</p>
              <p className="text-[11px] text-red-500 font-medium">Administrator</p>
            </div>
            <form action="/api/v1/auth/logout" method="POST">
              <button
                type="submit"
                id="admin-logout-btn"
                className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
