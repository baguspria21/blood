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

const TYPE_COLORS: Record<string, string> = {
  'A+': '#dc2626', 'A-': '#ef4444',
  'B+': '#2563eb', 'B-': '#3b82f6',
  'AB+': '#7c3aed', 'AB-': '#8b5cf6',
  'O+': '#16a34a', 'O-': '#22c55e',
}

export default async function AdminDashboardPage() {
  const supabase = await createSupabaseServerClient()

  // Fetch stats in parallel
  const [
    { count: totalRequests },
    { count: pendingRequests },
    { count: approvedRequests },
    { count: totalVolunteers },
    { data: inventory },
    { count: pendingDonations },
  ] = await Promise.all([
    supabase.from('blood_requests').select('*', { count: 'exact', head: true }),
    supabase.from('blood_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('blood_requests').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'volunteer'),
    supabase.from('blood_inventory').select('*').order('blood_type').order('rhesus'),
    supabase.from('volunteer_donations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
  ])

  // Recent 5 pending requests
  const { data: recentPending } = await supabase
    .from('blood_requests')
    .select('id, patient_name, blood_type, rhesus, bags_needed, bags_fulfilled, created_at, hospitals(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(5)

  const totalBags = (inventory ?? []).reduce((s: number, i: { bags_count: number }) => s + i.bags_count, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm">Ringkasan aktivitas Blood-Connect Palu</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Permintaan" value={totalRequests ?? 0} />
        <StatCard label="Menunggu Review" value={pendingRequests ?? 0} color="#d97706" sub="Perlu tindakan" />
        <StatCard label="Disetujui" value={approvedRequests ?? 0} color="#16a34a" />
        <StatCard label="Total Relawan" value={totalVolunteers ?? 0} color="#7c3aed" />
      </div>

      {/* Blood Inventory Summary */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-red-50 flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-gray-900">Stok Darah</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Total: <strong className="text-gray-700">{totalBags} kantong</strong>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {(pendingDonations ?? 0) > 0 && (
              <Link
                href="/admin/donasi"
                className="text-xs font-bold px-2.5 py-1 rounded-full text-amber-700 no-underline"
                style={{ background: '#fffbeb', border: '1px solid #fde68a' }}
              >
                🩸 {pendingDonations} donor menunggu
              </Link>
            )}
            <Link
              href="/admin/inventaris"
              className="text-xs font-semibold text-red-600 hover:underline no-underline"
            >
              Kelola Stok →
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-4 md:grid-cols-8 gap-0 divide-x divide-gray-50">
          {(inventory ?? []).map((item: { id: string; blood_type: string; rhesus: string; bags_count: number }) => {
            const key = `${item.blood_type}${item.rhesus}`
            const color = TYPE_COLORS[key] ?? '#6b7280'
            const empty = item.bags_count === 0
            const low = item.bags_count <= 3

            return (
              <div
                key={item.id}
                className="flex flex-col items-center py-4 px-2"
                style={empty ? { background: '#fef2f2' } : low ? { background: '#fffbeb' } : {}}
              >
                <div
                  className="w-9 h-9 rounded-lg flex flex-col items-center justify-center mb-2"
                  style={{ background: color, boxShadow: `0 2px 6px ${color}30` }}
                >
                  <span className="text-white font-display font-black text-[10px] leading-none">{item.blood_type}</span>
                  <span className="font-bold text-[8px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.rhesus}</span>
                </div>
                <p className="font-display text-xl font-bold text-gray-900">{item.bags_count}</p>
                <p className="text-[9px] text-gray-400">kantong</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent Pending */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-red-50 flex items-center justify-between">
          <h2 className="font-display font-bold text-gray-900">Permintaan Terbaru (Pending)</h2>
          <Link
            href="/admin/permintaan"
            id="admin-view-all-requests"
            className="text-xs font-semibold text-red-600 hover:underline"
          >
            Lihat Semua →
          </Link>
        </div>

        {recentPending && recentPending.length > 0 ? (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['Pasien', 'Darah', 'Kantong', 'RS', 'Waktu'].map((h) => (
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
                    <span
                      className="font-bold text-white text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--gradient-brand)' }}
                    >
                      {req.blood_type}{req.rhesus}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {req.bags_fulfilled}/{req.bags_needed}
                  </td>
                  <td className="px-5 py-3 text-gray-600 truncate max-w-[160px]">
                    {(req.hospitals as any)?.name ?? '-'}
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">
                    {new Date(req.created_at).toLocaleString('id-ID', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="px-5 py-12 text-center text-gray-400">
            <p className="text-4xl mb-2">🎉</p>
            <p className="font-medium">Tidak ada permintaan yang menunggu review.</p>
          </div>
        )}
      </div>
    </div>
  )
}
