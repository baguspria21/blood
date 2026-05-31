'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '@/lib/supabaseClient'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────
type TStatus = 'pending' | 'approved' | 'completed' | 'rejected'

interface RequestRow {
  id: string
  patient_name: string
  blood_type: string | null
  rhesus: string | null
  requesting_hospital: string | null
  request_date: string | null
  needed_date: string | null
  status: TStatus
  rejection_notes: string | null
  created_at: string
  // Bag counts from responses
  bags_given?: number
}

interface Props {
  initialRequests: RequestRow[]
  userId: string
}

// ── Status config ──────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<TStatus, { label: string; color: string; bg: string; icon: string }> = {
  pending:   { label: 'Menunggu Verifikasi', color: '#b45309', bg: '#fef3c7', icon: '⏳' },
  approved:  { label: 'Sedang Diproses',    color: '#1d4ed8', bg: '#dbeafe', icon: '🔄' },
  completed: { label: 'Selesai',            color: '#15803d', bg: '#dcfce7', icon: '✅' },
  rejected:  { label: 'Ditolak',            color: '#b91c1c', bg: '#fee2e2', icon: '❌' },
}

// ── Helper ─────────────────────────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusPill({ status }: { status: TStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6', icon: '•' }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function HospitalStatusLive({ initialRequests, userId }: Props) {
  const [requests, setRequests] = useState<RequestRow[]>(initialRequests)
  const [flashIds, setFlashIds] = useState<Set<string>>(new Set())
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const prevStatuses = useRef<Record<string, TStatus>>({})

  // Initialize previous statuses map
  useEffect(() => {
    const map: Record<string, TStatus> = {}
    initialRequests.forEach(r => { map[r.id] = r.status })
    prevStatuses.current = map
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const supabase = getSupabase()

    // ── Realtime subscription on ALL changes to transfusion_requests ──────────
    // We filter client-side because Supabase realtime filter on user_id
    // requires the column to exist in the table. We subscribe broadly and filter.
    const channel = supabase
      .channel(`hospital-status-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transfusion_requests',
        },
        async (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as RequestRow
            // Check if this request belongs to our list
            setRequests(prev => {
              const idx = prev.findIndex(r => r.id === updated.id)
              if (idx === -1) return prev // not ours

              // Detect status change → flash
              if (prevStatuses.current[updated.id] !== updated.status) {
                prevStatuses.current[updated.id] = updated.status
                setFlashIds(f => {
                  const next = new Set(f)
                  next.add(updated.id)
                  return next
                })
                setTimeout(() => {
                  setFlashIds(f => {
                    const next = new Set(f)
                    next.delete(updated.id)
                    return next
                  })
                }, 2000)
              }

              const next = [...prev]
              next[idx] = { ...next[idx], ...updated }
              return next
            })
            setLastUpdated(new Date())
          }

          if (payload.eventType === 'INSERT') {
            // Fetch the new record with bag counts
            const { data } = await supabase
              .from('transfusion_requests')
              .select('id, patient_name, blood_type, rhesus, requesting_hospital, request_date, needed_date, status, rejection_notes, created_at')
              .eq('id', (payload.new as RequestRow).id)
              .single()
            if (data) {
              setRequests(prev => [data as RequestRow, ...prev])
              prevStatuses.current[(data as RequestRow).id] = (data as RequestRow).status
              setLastUpdated(new Date())
            }
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const counts = {
    total:     requests.length,
    pending:   requests.filter(r => r.status === 'pending').length,
    approved:  requests.filter(r => r.status === 'approved').length,
    completed: requests.filter(r => r.status === 'completed').length,
    rejected:  requests.filter(r => r.status === 'rejected').length,
  }

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Status Permintaan Transfusi</h1>
          <p className="text-gray-500 text-sm mt-1">
            Pembaruan real-time dari Admin / UTD Bank Darah
            {lastUpdated && (
              <span className="ml-2 text-green-600 font-medium">
                · Diperbarui {lastUpdated.toLocaleTimeString('id-ID')}
              </span>
            )}
          </p>
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

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total',         value: counts.total,     color: '#6b7280', bg: '#f9fafb' },
          { label: 'Menunggu',      value: counts.pending,   color: '#b45309', bg: '#fef3c7' },
          { label: 'Diproses',      value: counts.approved,  color: '#1d4ed8', bg: '#dbeafe' },
          { label: 'Selesai',       value: counts.completed, color: '#15803d', bg: '#dcfce7' },
          { label: 'Ditolak',       value: counts.rejected,  color: '#b91c1c', bg: '#fee2e2' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center" style={{ borderTop: `3px solid ${s.color}` }}>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{s.label}</p>
            <p className="font-display text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Request Cards ── */}
      {requests.length === 0 ? (
        <div className="card px-5 py-16 text-center text-gray-400">
          <p className="text-4xl mb-3">📋</p>
          <p className="font-semibold text-gray-600">Belum ada permintaan transfusi</p>
          <p className="text-sm mt-1">Klik tombol &quot;+ Permintaan Baru&quot; untuk memulai.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(req => {
            const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
            const isFlashing = flashIds.has(req.id)

            return (
              <div
                key={req.id}
                className="card overflow-hidden transition-all duration-500"
                style={{
                  borderLeft: `4px solid ${cfg.color}`,
                  boxShadow: isFlashing
                    ? `0 0 0 3px ${cfg.color}40, 0 4px 20px rgba(0,0,0,0.08)`
                    : undefined,
                }}
              >
                <div className="p-5">
                  {/* Top row */}
                  <div className="flex items-start justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-display font-bold text-gray-900 text-lg">{req.patient_name}</h2>
                        {req.blood_type && (
                          <span className="font-display font-black text-white text-sm px-2.5 py-0.5 rounded-lg"
                            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                            {req.blood_type}{req.rhesus}
                          </span>
                        )}
                        {isFlashing && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full animate-pulse"
                            style={{ color: cfg.color, background: cfg.bg }}>
                            ✨ Baru diperbarui!
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{req.requesting_hospital ?? '—'}</p>
                    </div>
                    <StatusPill status={req.status} />
                  </div>

                  {/* Info row */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {[
                      { label: 'Tgl Permintaan',  value: fmtDate(req.request_date) },
                      { label: 'Tgl Diperlukan',  value: fmtDate(req.needed_date) },
                      { label: 'ID Permintaan',   value: req.id.slice(0, 8).toUpperCase() + '…' },
                      { label: 'Dibuat',          value: fmtDate(req.created_at) },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                        <p className="font-semibold text-gray-800 font-mono">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Rejection notes */}
                  {req.status === 'rejected' && req.rejection_notes && (
                    <div className="mt-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                      <p className="text-xs font-bold text-red-600 mb-0.5">Keterangan Admin</p>
                      <p className="text-sm text-red-700">{req.rejection_notes}</p>
                    </div>
                  )}

                  {/* In-progress indicator */}
                  {req.status === 'approved' && (
                    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                      <p className="text-xs text-blue-700 font-medium">
                        Admin sedang memproses permintaan ini. Halaman akan otomatis diperbarui.
                      </p>
                    </div>
                  )}

                  {/* Print button */}
                  <div className="mt-4 flex justify-end">
                    <a
                      href={`/api/v1/pdf/transfusion-request/${req.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      id={`status-cetak-${req.id}`}
                      className="text-xs font-bold text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      🖨 Cetak Surat
                    </a>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Footer note ── */}
      <p className="text-center text-xs text-gray-400">
        Halaman ini diperbarui secara otomatis saat Admin mengubah status permintaan.
        Hubungi <strong>PMI Kota Palu</strong> di <strong>(0451) 421580</strong> jika ada pertanyaan.
      </p>
    </div>
  )
}
