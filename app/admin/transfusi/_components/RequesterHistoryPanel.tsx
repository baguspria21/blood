import { createSupabaseServerClient } from '@/lib/supabaseServer'

interface Props {
  userId: string
  hospitalName: string | null
  profileName: string | null
  contactPhone: string
}

interface Stats {
  totalRequests: number
  pending: number
  approved: number
  completed: number
  rejected: number
  donorCount: number
}

async function fetchRequesterStats(userId: string): Promise<Stats> {
  const supabase = await createSupabaseServerClient()

  // Get all requests by this hospital user — we identify by requesting_hospital matching their profile,
  // or better: by user_id if the column exists. Since the schema may not always have user_id on transfusion_requests,
  // we join via profiles hospital_name matching. Use a broad approach: count rows by created user context.
  // Since transfusion_requests doesn't have a user_id FK currently, we cross-reference by phone/hospital.
  // Best approach: fetch all requests and count (within admin context, no RLS issue).
  const { data: allRequests } = await supabase
    .from('transfusion_requests')
    .select('id, status, contact_phone')

  // Also try matching by user profile phone
  const { data: profile } = await supabase
    .from('profiles')
    .select('phone_number')
    .eq('id', userId)
    .single()

  const phone = profile?.phone_number ?? ''
  const matched = (allRequests ?? []).filter(r =>
    phone && r.contact_phone && r.contact_phone.replace(/\D/g, '').includes(phone.replace(/\D/g, '').slice(-8))
  )

  // Volunteer donations by this user
  const { count: donorCount } = await supabase
    .from('volunteer_donations')
    .select('*', { count: 'exact', head: true })
    .eq('volunteer_id', userId)
    .eq('status', 'completed')

  return {
    totalRequests: matched.length,
    pending:   matched.filter(r => r.status === 'pending').length,
    approved:  matched.filter(r => r.status === 'approved').length,
    completed: matched.filter(r => r.status === 'completed').length,
    rejected:  matched.filter(r => r.status === 'rejected').length,
    donorCount: donorCount ?? 0,
  }
}

export async function RequesterHistoryPanel({ userId, hospitalName, profileName, contactPhone }: Props) {
  let stats: Stats
  try {
    stats = await fetchRequesterStats(userId)
  } catch {
    stats = { totalRequests: 0, pending: 0, approved: 0, completed: 0, rejected: 0, donorCount: 0 }
  }

  const fulfillmentRate = stats.totalRequests > 0
    ? Math.round((stats.completed / stats.totalRequests) * 100)
    : 0

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100"
        style={{ background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
            style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}>
            👤
          </div>
          <div>
            <h3 className="font-display font-bold text-gray-900">Deskripsi & Riwayat Pemohon</h3>
            <p className="text-xs text-gray-500">Profil rumah sakit & histori sebagai pemohon / pendonor</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Identity */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            { label: 'Nama RS / Institusi', value: hospitalName ?? '—' },
            { label: 'PIC / Kontak',        value: profileName ?? '—' },
            { label: 'No. Telepon',         value: contactPhone || '—' },
            { label: 'User ID',             value: userId.slice(0, 8).toUpperCase() + '…' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
              <p className="font-semibold text-gray-800 text-xs leading-snug">{value}</p>
            </div>
          ))}
        </div>

        {/* Request History Stats */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]">📋</span>
            Riwayat Permintaan Transfusi
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total',    value: stats.totalRequests, color: '#374151', bg: '#f9fafb' },
              { label: 'Selesai', value: stats.completed,     color: '#15803d', bg: '#dcfce7' },
              { label: 'Ditolak', value: stats.rejected,      color: '#b91c1c', bg: '#fee2e2' },
            ].map(s => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                <p className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: s.color, opacity: 0.7 }}>{s.label}</p>
                <p className="font-display text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Fulfillment rate bar */}
          {stats.totalRequests > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Tingkat Pemenuhan</span>
                <span className="text-xs font-bold" style={{ color: fulfillmentRate >= 70 ? '#15803d' : '#b45309' }}>
                  {fulfillmentRate}%
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-2 rounded-full transition-all"
                  style={{
                    width: `${fulfillmentRate}%`,
                    background: fulfillmentRate >= 70
                      ? 'linear-gradient(90deg, #16a34a, #15803d)'
                      : 'linear-gradient(90deg, #d97706, #b45309)',
                  }}
                />
              </div>
            </div>
          )}

          {stats.totalRequests === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">
              Tidak ditemukan riwayat permintaan yang cocok dengan akun ini.
            </p>
          )}
        </div>

        {/* Donor History */}
        <div className="border-t border-gray-100 pt-4">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="w-4 h-4 rounded bg-red-100 text-red-600 flex items-center justify-center text-[10px]">🩸</span>
            Riwayat sebagai Pendonor
          </p>
          {stats.donorCount > 0 ? (
            <div className="flex items-center gap-3 bg-green-50 border border-green-100 rounded-xl p-3">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold text-lg">
                {stats.donorCount}
              </div>
              <div>
                <p className="text-sm font-bold text-green-800">Pernah Berdonasi</p>
                <p className="text-xs text-green-600">{stats.donorCount}× donasi darah terverifikasi</p>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400">Belum pernah tercatat sebagai pendonor.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
