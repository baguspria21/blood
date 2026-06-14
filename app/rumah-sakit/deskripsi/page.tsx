'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

interface TransfusionResponse {
  id: string
  transfusion_request_id: string
  bag_number: string
  blood_category: string | null
  blood_type_abo: string | null
  rhesus: string | null
  volume_cc: string | null
  collection_date: string | null
  officer_name: string | null
  release_date: string | null
  release_time: string | null
  receiver_name: string | null
  created_at: string
}

interface Request {
  id: string
  patient_name: string
  blood_type: string | null
  rhesus: string | null
  requesting_hospital: string | null
  request_date: string | null
  status: string
  admin_notes: string | null
  rejection_notes: string | null
  estimated_pickup_time: string | null
  updated_at: string
  responses: TransfusionResponse[]
}

// ── Parsed unavailable item ───────────────────────────────────────────────────
interface UnavailableItem {
  label: string
  note: string | null
}

/**
 * Parse the rejection_notes field which has the format:
 * "Tidak tersedia: WB Biasa (Stok habis), FFP"
 * → [{ label: "WB Biasa", note: "Stok habis" }, { label: "FFP", note: null }]
 */
function parseUnavailableItems(notes: string | null): UnavailableItem[] {
  if (!notes) return []
  const prefix = 'Tidak tersedia: '
  const body = notes.startsWith(prefix) ? notes.slice(prefix.length) : notes
  // Split by ", " but carefully (notes inside parens shouldn't split)
  const items: UnavailableItem[] = []
  // Use a simple state machine to split by ", " at the top level
  let current = ''
  let depth = 0
  for (let i = 0; i < body.length; i++) {
    const ch = body[i]
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0 && body[i + 1] === ' ') {
      items.push(parseItem(current.trim()))
      current = ''
      i++ // skip the space
      continue
    }
    current += ch
  }
  if (current.trim()) items.push(parseItem(current.trim()))
  return items
}

function parseItem(raw: string): UnavailableItem {
  const match = raw.match(/^(.+?)\s*\((.+)\)$/)
  if (match) return { label: match[1].trim(), note: match[2].trim() }
  return { label: raw, note: null }
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string;  }> = {
  pending:   { label: 'Menunggu Verifikasi', color: '#b45309', bg: '#fef3c7', border: '#fde68a' },
  approved:  { label: 'Sedang Diproses',     color: '#1d4ed8', bg: '#dbeafe', border: '#bfdbfe' },
  completed: { label: 'Selesai',             color: '#15803d', bg: '#dcfce7', border: '#86efac' },
  rejected:  { label: 'Ditolak',             color: '#b91c1c', bg: '#fee2e2', border: '#fca5a5' },
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

function fmtDatetime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function BloodBagCard({ r }: { r: TransfusionResponse }) {
  return (
    <div className="rounded-xl border-2 overflow-hidden"
      style={{ borderColor: '#dc2626', background: 'linear-gradient(135deg, #fff5f5, #ffffff)' }}>
      <div className="px-4 py-2 flex items-center gap-2"
        style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
        <span className="text-white text-xs font-bold"> Kantong #{r.bag_number}</span>
        {r.blood_type_abo && (
          <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {r.blood_type_abo}{r.rhesus}
          </span>
        )}
      </div>
      <div className="p-4 grid grid-cols-2 gap-2 text-xs">
        {[
          { label: 'Jenis Produk',      value: r.blood_category ?? '—' },
          { label: 'Volume',            value: r.volume_cc ? `${r.volume_cc} cc` : '—' },
          { label: 'Tgl Pengambilan',   value: fmtDate(r.collection_date) },
          { label: 'Tgl Pengeluaran',   value: fmtDate(r.release_date) },
          { label: 'Jam',               value: r.release_time ?? '—' },
          { label: 'Petugas (ATD)',     value: r.officer_name ?? '—' },
          { label: 'Penerima',          value: r.receiver_name ?? '—' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
            <p className="font-semibold text-gray-800 mt-0.5">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RumahSakitDeskripsiPage() {
  const [requests, setRequests] = useState<Request[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Data isolation: track the authenticated hospital user's ID
  const [userId, setUserId] = useState<string | null>(null)

  // Resolve the current user once on mount
  useEffect(() => {
    getSupabase()
      .auth.getUser()
      .then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const fetchAll = useCallback(async (uid: string) => {
    const supabase = getSupabase()
    const { data } = await supabase
      .from('transfusion_requests')
      .select(`
        id, patient_name, blood_type, rhesus, requesting_hospital,
        request_date, status, admin_notes, rejection_notes,
        estimated_pickup_time, updated_at,
        transfusion_responses (
          id, transfusion_request_id, bag_number, blood_category,
          blood_type_abo, rhesus, volume_cc, collection_date,
          officer_name, release_date, release_time, receiver_name, created_at
        )
      `)
      // ── Application-level data isolation ──
      .eq('user_id', uid)
      .order('updated_at', { ascending: false })
      .limit(30)

    if (data) {
      const mapped = data.map(r => ({
        ...r,
        responses: (r.transfusion_responses ?? []) as TransfusionResponse[],
      }))
      setRequests(mapped)
      if (!expandedId) {
        const first = mapped.find(r => r.responses.length > 0 || r.status !== 'pending')
        if (first) setExpandedId(first.id)
      }
    }
    setLoading(false)
    setLastUpdated(new Date())
  }, [expandedId])

  // Subscribe to realtime updates once we have the user ID
  useEffect(() => {
    if (!userId) return

    fetchAll(userId)

    const supabase = getSupabase()
    const channel = supabase
      .channel(`rs-deskripsi-live-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfusion_requests' }, () => {
        fetchAll(userId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfusion_responses' }, () => {
        fetchAll(userId)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, fetchAll])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded-xl w-64 animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Deskripsi &amp; Riwayat Pemohon</h1>
          <p className="text-gray-500 text-sm mt-1">
            Detail penanganan dan kantong darah yang dikeluarkan oleh UTD Bank Darah
            {lastUpdated && (
              <span className="ml-2 text-green-600 font-medium">
                · Diperbarui {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
          </p>
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          Live
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="card px-5 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-gray-600">Belum ada permintaan transfusi</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const cfg = STATUS_CFG[req.status] ?? STATUS_CFG.pending
            const isExpanded = expandedId === req.id
            const hasResponses = req.responses.length > 0
            const unavailableItems = parseUnavailableItems(req.rejection_notes)
            const hasUnavailable = unavailableItems.length > 0
            const hasPickupTime = !!req.estimated_pickup_time

            return (
              <div key={req.id} className="card overflow-hidden"
                style={{ borderLeft: `4px solid ${cfg.color}` }}>
                {/* Collapsible header */}
                <button
                  id={`deskripsi-toggle-${req.id}`}
                  className="w-full px-5 py-4 text-left flex items-center gap-4 hover:bg-gray-50/50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : req.id)}
                >
                  {/* Patient */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display font-bold text-gray-900">{req.patient_name}</span>
                      {req.blood_type && (
                        <span className="text-white text-xs font-bold px-2 py-0.5 rounded-lg"
                          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                          {req.blood_type}{req.rhesus}
                        </span>
                      )}
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                         {cfg.label}
                      </span>
                      {hasResponses && (
                        <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                           {req.responses.length} kantong
                        </span>
                      )}
                      {hasUnavailable && (
                        <span className="text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">
                          ⚠ {unavailableItems.length} tidak tersedia
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {req.requesting_hospital ?? '—'} · {fmtDate(req.request_date)}
                      · Diperbarui {fmtDate(req.updated_at)}
                    </p>
                  </div>
                  <span className="text-gray-400 text-sm">{isExpanded ? '▲' : '▼'}</span>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 px-5 pb-5 pt-4 space-y-4">

                    {/* Status-specific messages */}
                    {req.status === 'pending' && (
                      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-center gap-3">
                        <div>
                          <p className="text-sm font-bold text-amber-800">Menunggu Verifikasi</p>
                          <p className="text-xs text-amber-700 mt-0.5">
                            Permintaan sedang antri untuk diverifikasi Admin UTD. Halaman ini akan otomatis memperbarui saat ada perubahan.
                          </p>
                        </div>
                      </div>
                    )}

                    {req.status === 'approved' && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
                        <span className="text-2xl">🔄</span>
                        <div>
                          <p className="text-sm font-bold text-blue-800">Sedang Diproses oleh UTD</p>
                          <p className="text-xs text-blue-700 mt-0.5">
                            Admin UTD sedang menyiapkan darah. Detail kantong tersedia di bawah.
                          </p>
                        </div>
                      </div>
                    )}

                    {req.status === 'rejected' && (
                      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-red-800 mb-1">Permintaan Ditolak / Darah Tidak Tersedia</p>
                        {req.rejection_notes ? (
                          <p className="text-sm text-red-700">{req.rejection_notes}</p>
                        ) : (
                          <p className="text-xs text-red-600">Tidak ada catatan. Hubungi Admin UTD untuk informasi lebih lanjut.</p>
                        )}
                      </div>
                    )}

                    {/* Estimated pickup time — prominent display */}
                    {hasPickupTime && (req.status === 'approved' || req.status === 'completed') && (
                      <div
                        className="rounded-xl p-4 flex items-start gap-3"
                        style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '1.5px solid #93c5fd' }}
                      >
                        <div>
                          <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-0.5">Estimasi Waktu Pengambilan Darah</p>
                          <p className="text-sm font-bold text-blue-900">{fmtDatetime(req.estimated_pickup_time)}</p>
                          <p className="text-xs text-blue-600 mt-0.5">
                            Pastikan petugas atau keluarga pasien sudah siap di UTD/PMI pada waktu tersebut.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Admin notes (general) */}
                    {req.admin_notes && req.status !== 'rejected' && (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">📝 Catatan dari Admin</p>
                        <p className="text-sm text-gray-700">{req.admin_notes}</p>
                      </div>
                    )}

                    {/* Unavailable items section */}
                    {hasUnavailable && (req.status === 'approved' || req.status === 'completed' || req.status === 'rejected') && (
                      <div className="rounded-xl overflow-hidden border border-orange-200">
                        <div className="px-4 py-2.5 flex items-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #fed7aa, #fdba74)' }}>
                          <span className="text-sm">⚠️</span>
                          <p className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                            Produk Tidak Tersedia ({unavailableItems.length} item)
                          </p>
                        </div>
                        <div className="p-3 space-y-2" style={{ background: '#fff7ed' }}>
                          {unavailableItems.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-white border border-orange-100">
                              <span className="text-base flex-shrink-0 mt-0.5">❌</span>
                              <div>
                                <p className="text-sm font-bold text-gray-800">{item.label}</p>
                                {item.note ? (
                                  <p className="text-xs text-orange-700 mt-0.5">
                                    <span className="font-semibold">Keterangan:</span> {item.note}
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-400 mt-0.5">Tidak ada keterangan tambahan</p>
                                )}
                              </div>
                            </div>
                          ))}
                          <p className="text-[10px] text-orange-600 font-medium px-1">
                            Hubungi Admin UTD untuk informasi ketersediaan selanjutnya.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Blood bag responses from admin */}
                    {hasResponses && (
                      <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                          Kantong Darah Dikeluarkan ({req.responses.length} kantong)
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {req.responses.map(r => (
                            <BloodBagCard key={r.id} r={r} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Print button */}
                    <div className="flex justify-end">
                      <a
                        href={`/api/v1/pdf/transfusion-response/${req.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        id={`deskripsi-cetak-${req.id}`}
                        className="text-xs font-bold text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        🖨 Cetak Surat Pengeluaran
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <p className="text-center text-xs text-gray-400">
        Data diperbarui otomatis saat Admin UTD mengubah status atau menambah data kantong darah.
      </p>
    </div>
  )
}
