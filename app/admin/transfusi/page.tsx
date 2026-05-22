import { createSupabaseServerClient } from '@/lib/supabaseServer'
import Link from 'next/link'

export const metadata = { title: 'Permintaan Transfusi — Admin | Blood-Connect Palu' }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Menunggu',  color: '#b45309', bg: '#fef3c7' },
    approved:  { label: 'Diproses', color: '#1d4ed8', bg: '#dbeafe' },
    completed: { label: 'Selesai',  color: '#15803d', bg: '#dcfce7' },
    rejected:  { label: 'Ditolak',  color: '#b91c1c', bg: '#fee2e2' },
  }
  const s = map[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

export default async function AdminTransfusiPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status: filterStatus } = await searchParams
  const supabase = await createSupabaseServerClient()

  let query = supabase
    .from('transfusion_requests')
    .select(`
      id, patient_name, blood_type, rhesus, requesting_hospital,
      request_date, needed_date, status, created_at,
      diagnosis
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  if (filterStatus && filterStatus !== 'all') {
    query = query.eq('status', filterStatus)
  }

  const { data: requests } = await query

  // Count responses per request
  const ids = (requests ?? []).map(r => r.id)
  const { data: responseCounts } = ids.length > 0
    ? await supabase
        .from('transfusion_responses')
        .select('transfusion_request_id')
        .in('transfusion_request_id', ids)
    : { data: [] }

  const countMap: Record<string, number> = {}
  ;(responseCounts ?? []).forEach(r => {
    countMap[r.transfusion_request_id] = (countMap[r.transfusion_request_id] ?? 0) + 1
  })

  const statuses = ['all', 'pending', 'approved', 'completed', 'rejected']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Permintaan Transfusi</h1>
          <p className="text-gray-500 text-sm">Kelola dan respons surat permintaan darah dari Rumah Sakit</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map(s => (
          <Link
            key={s}
            href={s === 'all' ? '/admin/transfusi' : `/admin/transfusi?status=${s}`}
            id={`filter-${s}`}
            className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
              (filterStatus ?? 'all') === s
                ? 'gradient-brand text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-red-200 hover:text-red-600'
            }`}
          >
            {s === 'all' ? 'Semua' : s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {requests && requests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Pasien', 'Gol. Darah', 'Rumah Sakit', 'Tgl Minta', 'Tgl Diperlukan', 'Diagnosa', 'Kantong', 'Status', 'Aksi'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {requests.map(req => (
                  <tr key={req.id} className="hover:bg-red-50/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{req.patient_name}</td>
                    <td className="px-4 py-3">
                      {req.blood_type ? (
                        <span className="font-bold text-white text-xs px-2 py-0.5 rounded-full" style={{ background: 'var(--gradient-brand)' }}>
                          {req.blood_type}{req.rhesus}
                        </span>
                      ) : <span className="text-gray-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{req.requesting_hospital ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {req.request_date ? new Date(req.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {req.needed_date ? (
                        <span className={`font-semibold ${new Date(req.needed_date) <= new Date() ? 'text-red-600' : 'text-gray-600'}`}>
                          {new Date(req.needed_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[120px] truncate">{req.diagnosis ?? '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${
                        (countMap[req.id] ?? 0) > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {countMap[req.id] ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={req.status} /></td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/transfusi/${req.id}`}
                        id={`respond-${req.id}`}
                        className="text-xs font-bold text-white px-3 py-1.5 rounded-lg gradient-brand hover:opacity-90 transition-opacity whitespace-nowrap"
                      >
                        Respons →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="px-5 py-14 text-center text-gray-400">
            <p className="text-4xl mb-2">📋</p>
            <p className="font-semibold text-gray-700">Tidak ada permintaan transfusi{filterStatus && filterStatus !== 'all' ? ` dengan status "${filterStatus}"` : ''}.</p>
          </div>
        )}
      </div>
    </div>
  )
}
