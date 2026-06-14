import { createSupabaseServerClient } from '@/lib/supabaseServer'
import Link from 'next/link'

export const metadata = { title: 'Relawan — Admin Blood-Connect Palu' }
export const dynamic = 'force-dynamic'

const BLOOD_TYPE_COLORS: Record<string, string> = {
  A: '#dc2626', B: '#7c3aed', AB: '#0891b2', O: '#d97706',
}

export default async function RelawanPage() {
  const supabase = await createSupabaseServerClient()

  const { data: volunteers, error } = await supabase
    .from('profiles')
    .select('id, name, phone_number, blood_type, rhesus, sub_district, is_active, last_donated_at, created_at')
    .eq('role', 'volunteer')
    .order('created_at', { ascending: false })

  const today = new Date()
  const cooldownDate = new Date()
  cooldownDate.setDate(today.getDate() - 90)

  function getCooldownStatus(lastDonated: string | null): { label: string; color: string } {
    if (!lastDonated) return { label: 'Belum pernah donor', color: '#16a34a' }
    const donatedDate = new Date(lastDonated)
    const daysSince = Math.floor((today.getTime() - donatedDate.getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince < 90) {
      const remaining = 90 - daysSince
      return { label: `Cooldown ${remaining} hari lagi`, color: '#d97706' }
    }
    return { label: `Terakhir donor ${daysSince} hari lalu`, color: '#16a34a' }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Data Relawan</h1>
          <p className="text-gray-500 text-sm">
            Total {volunteers?.length ?? 0} relawan terdaftar
          </p>
        </div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-red-600 transition-colors">
          ← Dashboard
        </Link>
      </div>

      {error && <div className="alert alert-error">{error.message}</div>}

      {/* Stats by blood type */}
      <div className="grid grid-cols-4 gap-3">
        {['A', 'B', 'AB', 'O'].map((bt) => {
          const count = volunteers?.filter((v) => v.blood_type === bt).length ?? 0
          return (
            <div key={bt} className="card p-4 text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 font-display font-black text-white text-lg"
                style={{ background: BLOOD_TYPE_COLORS[bt] ?? '#dc2626' }}
              >
                {bt}
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-xs text-gray-400">relawan</p>
            </div>
          )
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['Nama', 'No. WA', 'Goldar', 'Kecamatan', 'Status Donor', 'Aktif'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {volunteers?.map((v) => {
                const cooldown = getCooldownStatus(v.last_donated_at)
                return (
                  <tr key={v.id} className="hover:bg-red-50/20 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{v.phone_number}</td>
                    <td className="px-4 py-3">
                      <span
                        className="font-bold text-white text-xs px-2.5 py-1 rounded-full"
                        style={{ background: BLOOD_TYPE_COLORS[v.blood_type ?? ''] ?? '#6b7280' }}
                      >
                        {v.blood_type}{v.rhesus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{v.sub_district ?? '-'}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: cooldown.color }}>
                      {cooldown.label}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={v.is_active
                          ? { color: '#166534', background: '#dcfce7' }
                          : { color: '#92400e', background: '#fef3c7' }
                        }
                      >
                        {v.is_active ? 'Aktif' : 'Cooldown'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-100">
          {volunteers?.map((v) => {
            const cooldown = getCooldownStatus(v.last_donated_at)
            return (
              <div key={v.id} className="px-4 py-3 flex items-center gap-3">
                {/* Blood type badge */}
                <div
                  className="flex-shrink-0 w-11 h-11 rounded-xl flex flex-col items-center justify-center"
                  style={{ background: BLOOD_TYPE_COLORS[v.blood_type ?? ''] ?? '#6b7280' }}
                >
                  <span className="text-white font-black text-xs leading-none">{v.blood_type}</span>
                  <span className="text-white/70 text-[10px] font-bold">{v.rhesus}</span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-gray-900 text-sm truncate">{v.name}</p>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                      style={v.is_active
                        ? { color: '#166534', background: '#dcfce7' }
                        : { color: '#92400e', background: '#fef3c7' }
                      }
                    >
                      {v.is_active ? 'Aktif' : 'Cooldown'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">{v.phone_number}</p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] mt-0.5">
                    {v.sub_district && <span className="text-gray-400">📍 {v.sub_district}</span>}
                    <span style={{ color: cooldown.color }}>{cooldown.label}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {(!volunteers || volunteers.length === 0) && (
          <div className="py-14 text-center text-gray-400">
            <p className="text-3xl mb-2">👥</p>
            <p>Belum ada relawan terdaftar.</p>
          </div>
        )}
      </div>
    </div>
  )
}
