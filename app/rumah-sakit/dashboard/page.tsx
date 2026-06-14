import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export const metadata = { title: 'Dashboard — Portal Rumah Sakit | Blood-Connect Palu' }

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    pending:   { label: 'Menunggu',  color: '#b45309', bg: '#fef3c7' },
    approved:  { label: 'Diproses', color: '#1d4ed8', bg: '#dbeafe' },
    completed: { label: 'Selesai',  color: '#15803d', bg: '#dcfce7' },
    rejected:  { label: 'Ditolak',  color: '#b91c1c', bg: '#fee2e2' },
  }
  const s = map[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6' }
  return (
    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
      style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

export default async function RumahSakitDashboardPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch only THIS hospital account's transfusion requests (data isolation)
  const { data: requests } = await supabase
    .from('transfusion_requests')
    .select('id, patient_name, blood_type, rhesus, requesting_hospital, request_date, needed_date, status, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const total = requests?.length ?? 0
  const pending = requests?.filter(r => r.status === 'pending').length ?? 0
  const completed = requests?.filter(r => r.status === 'completed').length ?? 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Dashboard Rumah Sakit</h1>
          <p className="text-gray-500 text-sm">Kelola permintaan transfusi darah Anda</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            Live
          </span>
          <Link href="/permintaan-transfusi" id="status-new-request-btn"
            className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.25rem', fontSize: '0.8rem' }}>
            + Permintaan Baru
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Permintaan', value: total, color: '#dc2626' },
          { label: 'Menunggu Respons', value: pending, color: '#d97706' },
          { label: 'Selesai', value: completed, color: '#16a34a' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{s.label}</p>
            <p className="font-display text-3xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-red-50">
          <h2 className="font-display font-bold text-gray-900">Riwayat Permintaan Transfusi</h2>
        </div>

        {requests && requests.length > 0 ? (
          <>
            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Pasien', 'Gol. Darah', 'Tgl Minta', 'Tgl Diperlukan', 'Status', 'Cetak'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {requests.map(req => (
                    <tr key={req.id} className="hover:bg-red-50/20 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">{req.patient_name}</td>
                      <td className="px-5 py-3">
                        {req.blood_type ? (
                          <span className="font-bold text-white text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'var(--gradient-brand)' }}>
                            {req.blood_type}{req.rhesus}
                          </span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        {req.request_date ? new Date(req.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        {req.needed_date ? new Date(req.needed_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-5 py-3"><StatusBadge status={req.status} /></td>
                      <td className="px-5 py-3">
                        <a
                          href={`/api/v1/pdf/transfusion-request/${req.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          id={`cetak-${req.id}`}
                          className="text-xs font-bold text-red-600 border border-red-200 px-3 py-1 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                        >
                          🖨 Cetak
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-gray-100">
              {requests.map(req => (
                <div key={req.id} className="px-4 py-3 flex items-center gap-3">
                  {req.blood_type ? (
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
                      <span className="text-white font-black text-xs leading-none">{req.blood_type}</span>
                      <span className="text-red-200 text-[10px] font-bold">{req.rhesus}</span>
                    </div>
                  ) : (
                    <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-gray-100" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900 text-sm truncate">{req.patient_name}</p>
                      <StatusBadge status={req.status} />
                    </div>
                    <div className="flex flex-wrap gap-x-3 text-[11px] text-gray-400 mt-0.5">
                      <span>📅 {req.request_date ? new Date(req.request_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'}</span>
                      <span>⏰ {req.needed_date ? new Date(req.needed_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'}</span>
                    </div>
                  </div>
                  <a
                    href={`/api/v1/pdf/transfusion-request/${req.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    id={`cetak-mobile-${req.id}`}
                    className="flex-shrink-0 text-xs font-bold text-red-600 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors whitespace-nowrap"
                  >
                    🖨 Cetak
                  </a>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="px-5 py-14 text-center text-gray-400">
            <p className="text-4xl mb-3">📋</p>
            <p className="font-semibold text-gray-600">Belum ada permintaan transfusi</p>
            <p className="text-sm mt-1">Klik tombol "+ Permintaan Baru" untuk memulai.</p>
          </div>
        )}
      </div>
    </div>
  )
}
