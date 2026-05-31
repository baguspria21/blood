import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { DonateButton } from './_components/DonateButton'
import { BloodStockWidget } from './_components/BloodStockWidget'
import { FaqAccordion } from './_components/FaqAccordion'
import { VolunteerProfileTab } from './_components/VolunteerProfileTab'

export const metadata = {
  title: 'Dashboard Relawan — Blood-Connect Palu',
  description: 'Kelola profil dan aktivitas donor darah Anda.',
}

function BloodDropIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

export default async function VolunteerDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  if (profile.role === 'admin') redirect('/admin')

  // Fetch total successful donations (table uses status 'done')
  const { count: totalDonations } = await supabase
    .from('volunteer_donations')
    .select('*', { count: 'exact', head: true })
    .eq('volunteer_id', user.id)
    .eq('status', 'done')

  const today = new Date()
  const lastDonated = profile.last_donated_at ? new Date(profile.last_donated_at) : null
  const daysSinceDonation = lastDonated
    ? Math.floor((today.getTime() - lastDonated.getTime()) / (1000 * 60 * 60 * 24))
    : null
  const canDonate = daysSinceDonation === null || daysSinceDonation >= 90
  const cooldownRemaining = daysSinceDonation !== null ? Math.max(0, 90 - daysSinceDonation) : 0

  const { tab } = await searchParams
  const activeTab = tab === 'profil' ? 'profil' : 'dashboard'

  return (
    <div
      className="min-h-screen"
      style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #ffffff 55%, #fff1f2 100%)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-40 border-b border-red-100"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/relawan/dashboard" className="flex items-center gap-2.5 no-underline">
            <div
              className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}
            >
              <BloodDropIcon size={14} className="text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-display font-bold text-gray-900 text-sm block">
                Blood<span className="text-gradient">Connect</span>
              </span>
              <span className="block text-[10px] text-gray-400 font-medium -mt-0.5 tracking-wide">
                DASBOR RELAWAN
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            {/* Quick active status indicator */}
            <span
              className="hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
              style={profile.is_active
                ? { color: '#166534', background: '#dcfce7' }
                : { color: '#92400e', background: '#fef3c7' }}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${profile.is_active ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
              {profile.is_active ? 'Aktif' : 'Nonaktif'}
            </span>
            <form action="/api/v1/auth/logout" method="POST">
              <button
                type="submit"
                className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
              >
                Keluar
              </button>
            </form>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="max-w-3xl mx-auto px-4 border-t border-red-50">
          <nav className="flex gap-1 -mb-px">
            {[
              { key: 'dashboard', label: '🏠 Dashboard', href: '/relawan/dashboard' },
              { key: 'profil',    label: '👤 Profil Saya', href: '/relawan/dashboard?tab=profil' },
            ].map(t => (
              <Link
                key={t.key}
                href={t.href}
                id={`tab-${t.key}`}
                className="px-4 py-2.5 text-sm font-semibold border-b-2 transition-all whitespace-nowrap"
                style={activeTab === t.key
                  ? { borderColor: '#dc2626', color: '#dc2626' }
                  : { borderColor: 'transparent', color: '#6b7280' }}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">

        {activeTab === 'profil' ? (
          /* ── Profil Tab ── */
          <VolunteerProfileTab />
        ) : (
          /* ── Dashboard Tab ── */
          <>
            {/* Greeting */}
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">
                Halo, {profile.name} 👋
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Terima kasih telah menjadi pahlawan donor darah!
              </p>
            </div>

            {/* Donation Status Card */}
            <div
              className="card p-6"
              style={{ borderLeft: `4px solid ${canDonate ? '#16a34a' : '#d97706'}` }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{
                    background: canDonate
                      ? 'linear-gradient(135deg, #16a34a, #15803d)'
                      : 'linear-gradient(135deg, #d97706, #b45309)',
                    boxShadow: canDonate
                      ? '0 4px 12px rgba(22,163,74,0.3)'
                      : '0 4px 12px rgba(217,119,6,0.3)',
                  }}
                >
                  <span className="text-white text-2xl">
                    {canDonate ? '✓' : '⏳'}
                  </span>
                </div>
                <div className="flex-1">
                  <h2 className="font-display font-bold text-gray-900">
                    {canDonate ? 'Siap Donor!' : 'Masa Cooldown'}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {canDonate
                      ? daysSinceDonation === null
                        ? 'Anda belum pernah donor — mari mulai menyelamatkan nyawa!'
                        : `Terakhir donor ${daysSinceDonation} hari lalu. Anda sudah bisa donor lagi.`
                      : `${cooldownRemaining} hari lagi sebelum Anda bisa donor kembali.`}
                  </p>
                  {!canDonate && (
                    <div className="mt-2">
                      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.round(((90 - cooldownRemaining) / 90) * 100)}%`,
                            background: 'linear-gradient(90deg, #d97706, #f59e0b)',
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        {90 - cooldownRemaining}/90 hari terlewati
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Volunteer-Initiated Donation */}
            <DonateButton canDonate={canDonate} cooldownRemaining={cooldownRemaining} />

            {/* Quick Stats (profile summary) */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display font-bold text-gray-900">Ringkasan Profil</h2>
                <Link
                  href="/relawan/dashboard?tab=profil"
                  id="goto-profil-tab"
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  Edit Profil →
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Nama Lengkap',    value: profile.name },
                  { label: 'No. WhatsApp',    value: profile.phone_number },
                  {
                    label: 'Golongan Darah',
                    value: `${profile.blood_type}${profile.rhesus}`,
                    highlight: true,
                  },
                  { label: 'Kecamatan',       value: profile.sub_district || '—' },
                  { label: 'Total Donasi',    value: `${totalDonations ?? 0}×` },
                  {
                    label: 'Status',
                    value: profile.is_active ? 'Aktif' : 'Nonaktif',
                  },
                ].map(({ label, value, highlight }) => (
                  <div
                    key={label}
                    className={`rounded-xl p-3 ${highlight ? 'gradient-brand' : 'bg-gray-50'}`}
                  >
                    <p
                      className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${
                        highlight ? 'text-red-200' : 'text-gray-400'
                      }`}
                    >
                      {label}
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        highlight ? 'text-white text-xl font-display' : 'text-gray-800'
                      }`}
                    >
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Info */}
            <div className="card p-5 text-center" style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
              <p className="text-sm text-amber-800">
                📲 Saat ada permintaan darah yang cocok, Anda akan mendapat notifikasi via <strong>WhatsApp</strong> secara otomatis.
              </p>
            </div>

            {/* Blood Stock Widget */}
            <BloodStockWidget />

            {/* FAQ */}
            <FaqAccordion />

            {/* Footer */}
            <p className="text-center text-xs text-gray-400 pt-4">
              © 2025 Blood-Connect Palu · Didukung oleh PMI Kota Palu
            </p>
          </>
        )}
      </main>
    </div>
  )
}
