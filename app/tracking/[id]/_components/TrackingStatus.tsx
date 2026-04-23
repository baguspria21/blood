'use client'

import { useEffect, useState, useRef } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

type Status = 'pending' | 'approved' | 'completed' | 'rejected'

interface TrackingData {
  id: string
  patient_name: string
  blood_type: string
  rhesus: string
  bags_needed: number
  bags_fulfilled: number
  status: Status
  admin_notes: string | null
  created_at: string
  hospitals: { name: string; address: string } | null
}

const STEPS: { key: Status | 'searching'; label: string; desc: string }[] = [
  { key: 'pending',   label: 'Menunggu Verifikasi', desc: 'Permintaan sedang ditinjau oleh admin PMI' },
  { key: 'approved',  label: 'Disetujui',           desc: 'Permintaan diverifikasi, mencari relawan' },
  { key: 'searching', label: 'Mencari Relawan',     desc: 'Notifikasi sedang dikirim ke relawan cocok' },
  { key: 'completed', label: 'Terpenuhi',           desc: 'Relawan donor telah ditemukan!' },
]

function getStepIndex(status: Status): number {
  switch (status) {
    case 'pending':   return 0
    case 'approved':  return 2   // approved = step 1 (Disetujui) + step 2 (Mencari)
    case 'completed': return 3
    case 'rejected':  return -1
    default:          return 0
  }
}

function BloodDropIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

export function TrackingStatus({ requestId }: { requestId: string }) {
  const [data, setData] = useState<TrackingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  // Track "pulse" animation on status change
  const [pulse, setPulse] = useState(false)
  const prevStatus = useRef<Status | null>(null)

  useEffect(() => {
    const supabase = getSupabase()

    // ── Initial Fetch ────────────────────────────────────────────────────────
    supabase
      .from('blood_requests')
      .select(`
        id, patient_name, blood_type, rhesus, bags_needed,
        bags_fulfilled, status, admin_notes, created_at,
        hospitals ( name, address )
      `)
      .eq('id', requestId)
      .single()
      .then(({ data: row, error: err }) => {
        if (err || !row) {
          setError('Permintaan tidak ditemukan. Periksa kembali ID Anda.')
        } else {
          setData(row as unknown as TrackingData)
          setLastUpdated(new Date())
          prevStatus.current = row.status as Status
        }
        setLoading(false)
      })

    // ── Realtime Subscription ────────────────────────────────────────────────
    const channel = supabase
      .channel(`tracking-${requestId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blood_requests',
          filter: `id=eq.${requestId}`,
        },
        (payload) => {
          const updated = payload.new as TrackingData
          // Pulse animation if status changed
          if (prevStatus.current !== updated.status) {
            setPulse(true)
            setTimeout(() => setPulse(false), 1000)
            prevStatus.current = updated.status
          }
          setData((prev) => prev ? { ...prev, ...updated } : updated)
          setLastUpdated(new Date())
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [requestId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4" style={{ width: 40, height: 40, borderWidth: 4 }} />
          <p className="text-gray-500">Memuat status permintaan...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Permintaan Tidak Ditemukan</h2>
          <p className="text-gray-500 text-sm">{error ?? 'ID permintaan tidak valid.'}</p>
        </div>
      </div>
    )
  }

  const stepIndex = getStepIndex(data.status)
  const isRejected = data.status === 'rejected'
  const progressPct = data.bags_needed > 0
    ? Math.min(100, Math.round((data.bags_fulfilled / data.bags_needed) * 100))
    : 0

  return (
    <div
      className="min-h-screen px-4 py-8 md:py-12"
      style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #ffffff 55%, #fff1f2 100%)' }}
    >
      {/* Decorative blobs */}
      <div aria-hidden className="fixed top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #dc2626, transparent 70%)', transform: 'translate(30%,-30%)' }} />
      <div aria-hidden className="fixed bottom-0 left-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #dc2626, transparent 70%)', transform: 'translate(-30%,30%)' }} />

      <div className="relative z-10 max-w-xl mx-auto space-y-5">
        {/* Header */}
        <div className="text-center mb-6">
          <div
            className={`w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-3 ${pulse ? 'pulse-blood' : ''}`}
            style={{ boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}
          >
            <BloodDropIcon size={28} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Status Permintaan Darah</h1>
          <p className="text-gray-500 text-sm mt-1">Pembaruan real-time • ID: <span className="font-mono text-xs">{data.id.slice(0, 8)}…</span></p>
          {lastUpdated && (
            <p className="text-xs text-gray-400 mt-0.5">
              Terakhir diperbarui: {lastUpdated.toLocaleTimeString('id-ID')}
            </p>
          )}
        </div>

        {/* Rejected State */}
        {isRejected && (
          <div className="card p-6 text-center border-2 border-red-200" style={{ background: '#fff5f5' }}>
            <p className="text-4xl mb-3">❌</p>
            <h2 className="font-display text-xl font-bold text-red-700 mb-1">Permintaan Ditolak</h2>
            <p className="text-sm text-gray-600">
              {data.admin_notes
                ? `Alasan: ${data.admin_notes}`
                : 'Permintaan Anda tidak dapat diproses. Hubungi PMI Kota Palu untuk informasi lebih lanjut.'}
            </p>
          </div>
        )}

        {/* Progress Steps */}
        {!isRejected && (
          <div className="card p-6">
            <h2 className="font-display font-bold text-gray-900 mb-5">Progress Permintaan</h2>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-5 bottom-5 w-0.5 bg-gray-100" />

              <div className="space-y-6">
                {STEPS.map((step, idx) => {
                  const done   = idx < stepIndex
                  const active = idx === stepIndex
                  const future = idx > stepIndex

                  return (
                    <div key={step.key} className="relative flex items-start gap-4">
                      {/* Step circle */}
                      <div
                        className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all duration-500 ${
                          done   ? 'text-white' :
                          active ? 'text-white ring-4 ring-red-200' :
                                   'text-gray-400 bg-gray-100'
                        }`}
                        style={
                          done   ? { background: '#16a34a' } :
                          active ? { background: 'var(--gradient-brand)', boxShadow: '0 4px 12px rgba(220,38,38,0.4)' } :
                                   {}
                        }
                      >
                        {done   ? '✓' :
                         active ? (
                           <span className="relative flex h-3 w-3">
                             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                             <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                           </span>
                         ) :
                         (idx + 1)}
                      </div>

                      {/* Label */}
                      <div className="pt-2">
                        <p className={`font-semibold text-sm ${future ? 'text-gray-400' : 'text-gray-900'}`}>
                          {step.label}
                        </p>
                        {(done || active) && (
                          <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Patient Info Card */}
        <div className="card p-5">
          <h2 className="font-display font-bold text-gray-900 mb-4">Detail Permintaan</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Nama Pasien',    value: data.patient_name },
              { label: 'Golongan Darah', value: `${data.blood_type}${data.rhesus}` },
              { label: 'Rumah Sakit',    value: data.hospitals?.name ?? '-' },
              { label: 'Diajukan',       value: new Date(data.created_at).toLocaleDateString('id-ID', {
                  day: '2-digit', month: 'long', year: 'numeric',
                }),
              },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Blood Fulfillment Progress */}
        {data.status !== 'rejected' && (
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-display font-bold text-gray-900">Kantong Darah Terpenuhi</h2>
              <span
                className="font-display font-black text-2xl"
                style={{ color: progressPct >= 100 ? '#16a34a' : '#dc2626' }}
              >
                {progressPct}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden mb-2">
              <div
                className="h-4 rounded-full transition-all duration-700"
                style={{
                  width: `${progressPct}%`,
                  background: progressPct >= 100
                    ? 'linear-gradient(90deg,#16a34a,#15803d)'
                    : 'linear-gradient(90deg,#dc2626,#b91c1c)',
                }}
              />
            </div>
            <div className="flex justify-between text-sm text-gray-500">
              <span>{data.bags_fulfilled} kantong terpenuhi</span>
              <span>{data.bags_needed} kantong dibutuhkan</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400">
          Halaman ini diperbarui secara otomatis melalui koneksi real-time.<br />
          Hubungi <strong>PMI Kota Palu</strong> di <strong>(0451) 421580</strong> jika ada pertanyaan.
        </p>
      </div>
    </div>
  )
}
