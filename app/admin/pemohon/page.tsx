import { createSupabaseServerClient } from '@/lib/supabaseServer'
import Link from 'next/link'

export const metadata = { title: 'Riwayat Pemohon — Admin | Blood-Connect Palu' }
export const dynamic = 'force-dynamic'

export default async function AdminPemohonPage() {
  const supabase = await createSupabaseServerClient()

  // Fetch all hospital-role profiles
  const { data: hospitals } = await supabase
    .from('profiles')
    .select('id, name, phone_number, hospital_name, created_at, is_active')
    .eq('role', 'hospital')
    .order('created_at', { ascending: false })

  // Fetch all transfusion requests (to count per hospital by phone matching)
  const { data: allRequests } = await supabase
    .from('transfusion_requests')
    .select('id, status, contact_phone, requesting_hospital')

  // Build stats per hospital
  const stats = (hospitals ?? []).map(h => {
    const phone = h.phone_number?.replace(/\D/g, '').slice(-8) ?? ''
    const matched = (allRequests ?? []).filter(r => {
      const rp = r.contact_phone?.replace(/\D/g, '').slice(-8) ?? ''
      return phone && rp && rp === phone
    })
    return {
      ...h,
      totalRequests: matched.length,
      completed:    matched.filter(r => r.status === 'completed').length,
      pending:      matched.filter(r => r.status === 'pending').length,
      rejected:     matched.filter(r => r.status === 'rejected').length,
    }
  })

  const totalHospitals = stats.length
  const activeHospitals = stats.filter(h => h.is_active).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Riwayat Pemohon</h1>
          <p className="text-gray-500 text-sm">
            Deskripsi dan histori permintaan transfusi per rumah sakit
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="card px-4 py-2 text-center">
            <p className="text-xs text-gray-400 font-medium">Total RS</p>
            <p className="font-display text-xl font-bold text-gray-900">{totalHospitals}</p>
          </div>
          <div className="card px-4 py-2 text-center">
            <p className="text-xs text-gray-400 font-medium">Aktif</p>
            <p className="font-display text-xl font-bold text-green-600">{activeHospitals}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {stats.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Rumah Sakit', 'PIC / Kontak', 'No. WA', 'Total Req.', 'Selesai', 'Pending', 'Ditolak', 'Terdaftar', 'Aksi'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {stats.map(h => (
                  <tr key={h.id} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}>
                          🏥
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900 text-xs leading-tight">
                            {h.hospital_name || '—'}
                          </p>
                          <p className="text-[10px] text-gray-400 font-mono">{h.id.slice(0, 8)}…</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs font-medium">{h.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{h.phone_number}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-display font-bold text-gray-900">{h.totalRequests}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-xs px-2 py-0.5 rounded-full"
                        style={{ color: '#15803d', background: '#dcfce7' }}>
                        {h.completed}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-xs px-2 py-0.5 rounded-full"
                        style={{ color: '#b45309', background: '#fef3c7' }}>
                        {h.pending}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-xs px-2 py-0.5 rounded-full"
                        style={{ color: '#b91c1c', background: '#fee2e2' }}>
                        {h.rejected}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {new Date(h.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/transfusi?hospital=${encodeURIComponent(h.hospital_name ?? h.name)}`}
                        id={`pemohon-view-${h.id}`}
                        className="text-xs font-bold text-cyan-700 border border-cyan-200 px-2.5 py-1 rounded-lg hover:bg-cyan-50 transition-colors whitespace-nowrap"
                      >
                        Lihat Permintaan →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p className="text-4xl mb-3">🏥</p>
            <p className="font-semibold text-gray-600">Belum ada rumah sakit terdaftar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
