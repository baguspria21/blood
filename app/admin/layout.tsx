import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import Link from 'next/link'
import { AdminNavClient } from './_components/AdminNavClient'

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
      {/* ── Sticky header ───────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 border-b border-red-100"
        style={{ background: 'white', boxShadow: '0 1px 8px rgba(220,38,38,0.08)' }}
      >
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Logo / Brand */}
          <Link href="/admin" className="flex items-center gap-2.5 no-underline flex-shrink-0">
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

          {/* Desktop nav + mobile hamburger — handled by client component */}
          <AdminNavClient profileName={profile?.name ?? 'Admin'} />
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
