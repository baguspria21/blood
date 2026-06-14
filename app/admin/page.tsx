import { createSupabaseServerClient } from '@/lib/supabaseServer'
import Link from 'next/link'

export const metadata = {
  title: 'Dashboard Admin — Blood-Connect Palu',
}

function StatCard({
  label, value, sub, color = '#dc2626',
}: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="card p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{label}</p>
      <p className="font-display text-3xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient()

  const [
    { count: totalTransfusions },
    { count: pendingTransfusions },
    { count: totalVolunteers },
    { count: pendingDonations },
    { count: hospitalUsers },
  ] = await Promise.all([
    supabase.from('transfusion_requests').select('*', { count: 'exact', head: true }),
    supabase.from('transfusion_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer'),
    supabase.from('volunteer_donations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'hospital'),
  ])

  // Recent 5 pending transfusion requests
  const { data: recentPending } = await supabase
    .from('transfusion_requests')
    .select('id, patient_name, blood_type, rhesus, requesting_hospital, request_date, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Ringkasan aktivitas Blood-Connect Palu</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Permintaan Transfusi" value={totalTransfusions ?? 0} />
        <StatCard label="Menunggu Respons" value={pendingTransfusions ?? 0} color="#d97706" sub="Perlu tindakan" />
        <StatCard label="Total Relawan" value={totalVolunteers ?? 0} color="#7c3aed" />
        <StatCard label="RS Terdaftar" value={hospitalUsers ?? 0} color="#0891b2" />
        <StatCard label="Donasi Pending" value={pendingDonations ?? 0} color="#e11d48" sub="Menunggu review" />
      </div>

      {/* Recent Pending Transfusions */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-red-50 flex items-center justify-between">
          <h2 className="font-display font-bold text-gray-900">Permintaan Transfusi Terbaru (Pending)</h2>
          <Link
            href="/admin/transfusi"
            id="admin-view-all-transfusions"
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            Lihat Semua →
          </Link>
        </div>

        {recentPending && recentPending.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Pasien', 'Darah', 'Rumah Sakit', 'Tgl Minta', 'Aksi'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {recentPending.map((req) => (
                    <tr key={req.id} className="hover:bg-red-50/30 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{req.patient_name}</td>
                      <td className="px-5 py-3">
                        {req.blood_type ? (
                          <span className="font-bold text-white text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--gradient-brand)' }}>
                            {req.blood_type}{req.rhesus}
                          </span>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-600 truncate max-w-[160px]">{req.requesting_hospital ?? '—'}</td>
                      <td className="px-5 py-3 text-gray-400 text-xs">
                        {req.request_date ? new Date(req.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3">
                        <Link href={`/admin/transfusi/${req.id}`} className="text-xs font-semibold text-red-600 hover:underline">
                          Respons →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-50">
              {recentPending.map((req) => (
                <div key={req.id} className="px-4 py-3 flex items-center gap-3">
                  {req.blood_type ? (
                    <span className="font-bold text-white text-xs px-2.5 py-1.5 rounded-xl flex-shrink-0" style={{ background: 'var(--gradient-brand)' }}>
                      {req.blood_type}{req.rhesus}
                    </span>
                  ) : <span className="w-10 h-8 rounded-xl bg-gray-100 flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{req.patient_name}</p>
                    <p className="text-xs text-gray-500 truncate">{req.requesting_hospital ?? '—'}</p>
                    <p className="text-[11px] text-gray-400">
                      {req.request_date ? new Date(req.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                  <Link href={`/admin/transfusi/${req.id}`}
                    className="flex-shrink-0 text-xs font-bold text-white px-3 py-1.5 rounded-lg gradient-brand whitespace-nowrap">
                    Respons →
                  </Link>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-5 py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-medium">Tidak ada permintaan transfusi yang menunggu respons.</p>
          </div>
        )}
      </div>
    </div>
  )
}
