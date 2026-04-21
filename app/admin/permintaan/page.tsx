'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ActionButtons, StatusBadge } from './_components/ActionButtons'
import { DetailModal } from './_components/DetailModal'
import Link from 'next/link'

type FilterStatus = 'pending' | 'approved' | 'rejected' | 'completed' | 'all'
type RequestStatus = 'pending' | 'approved' | 'completed' | 'rejected'

interface BloodRequest {
  id: string
  patient_name: string
  contact_phone: string
  blood_type: string
  rhesus: string
  bags_needed: number
  bags_fulfilled: number
  proof_url: string | null
  status: RequestStatus
  admin_notes: string | null
  created_at: string
  hospitals: { name: string; address: string; phone?: string } | null
}

const FILTER_TABS: { value: FilterStatus; label: string; emoji: string }[] = [
  { value: 'all',       label: 'Semua',     emoji: '📋' },
  { value: 'pending',   label: 'Menunggu',  emoji: '⏳' },
  { value: 'approved',  label: 'Disetujui', emoji: '✅' },
  { value: 'rejected',  label: 'Ditolak',   emoji: '❌' },
  { value: 'completed', label: 'Selesai',   emoji: '🎉' },
]

export default function ReviewPermintaanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeFilter = (searchParams.get('status') as FilterStatus) ?? 'pending'

  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<BloodRequest | null>(null)
  const [, startTransition] = useTransition()

  const fetchRequests = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = activeFilter !== 'all' ? `?status=${activeFilter}` : ''
      const res = await fetch(`/api/v1/admin/requests${params}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('Gagal mengambil data')
      const data = await res.json()
      setRequests(data.requests ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
    } finally {
      setLoading(false)
    }
  }, [activeFilter])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const setFilter = (f: FilterStatus) => {
    startTransition(() => {
      router.push(`/admin/permintaan?status=${f}`, { scroll: false })
    })
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Review Permintaan</h1>
          <p className="text-gray-500 text-sm">Verifikasi dan kelola permintaan darah masuk</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-red-600 transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            id={`filter-tab-${tab.value}`}
            onClick={() => setFilter(tab.value)}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
              activeFilter === tab.value
                ? 'text-white shadow-md'
                : 'text-gray-600 bg-white border border-gray-200 hover:border-red-200 hover:text-red-600'
            }`}
            style={activeFilter === tab.value ? { background: 'var(--gradient-brand)' } : {}}
          >
            {tab.emoji} {tab.label}
          </button>
        ))}
        <button
          onClick={fetchRequests}
          className="ml-auto text-sm text-gray-400 border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors"
          title="Refresh data"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-2 bg-gray-100 rounded w-full mt-3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && requests.length === 0 && !error && (
        <div className="card px-6 py-14 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold text-gray-700">Tidak ada permintaan dengan status ini</p>
          <p className="text-sm text-gray-400 mt-1">Coba pilih filter yang berbeda di atas.</p>
        </div>
      )}

      {/* Request Table — card layout */}
      {!loading && (
        <div className="card overflow-hidden">
          {requests.length > 0 && (
            <>
              {/* Table Header */}
              <div className="hidden md:grid grid-cols-[56px_1fr_120px_180px_160px_160px] gap-3 px-5 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div>Darah</div>
                <div>Pasien</div>
                <div>Kantong</div>
                <div>Rumah Sakit</div>
                <div>Waktu</div>
                <div>Aksi</div>
              </div>

              <div className="divide-y divide-gray-50">
                {requests.map((req) => {
                  const hospital = req.hospitals
                  const pct = req.bags_needed > 0
                    ? Math.round((req.bags_fulfilled / req.bags_needed) * 100)
                    : 0

                  return (
                    <div
                      key={req.id}
                      id={`request-row-${req.id}`}
                      className="flex flex-col md:grid md:grid-cols-[56px_1fr_120px_180px_160px_160px] gap-3 items-start md:items-center px-5 py-4 hover:bg-red-50/30 transition-colors"
                    >
                      {/* Blood type */}
                      <div
                        className="w-12 h-12 rounded-xl gradient-brand flex flex-col items-center justify-center flex-shrink-0"
                        style={{ boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
                      >
                        <span className="text-white font-display font-black text-sm leading-none">{req.blood_type}</span>
                        <span className="text-red-200 font-bold text-[10px]">{req.rhesus}</span>
                      </div>

                      {/* Patient info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-gray-900 text-sm">{req.patient_name}</p>
                          <StatusBadge status={req.status} />
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">📞 {req.contact_phone}</p>
                        {/* Progress bar */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${pct}%`,
                                background: pct >= 100 ? '#16a34a' : 'linear-gradient(90deg,#dc2626,#b91c1c)',
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-gray-500 whitespace-nowrap">
                            {req.bags_fulfilled}/{req.bags_needed}
                          </span>
                        </div>
                      </div>

                      {/* Bags */}
                      <div className="hidden md:block text-sm font-bold text-gray-700">
                        {req.bags_fulfilled} / {req.bags_needed}
                      </div>

                      {/* Hospital */}
                      <div className="hidden md:block text-xs text-gray-600 leading-snug">
                        <p className="font-medium truncate">{hospital?.name ?? '-'}</p>
                        <p className="text-gray-400 truncate">{hospital?.address ?? ''}</p>
                      </div>

                      {/* Time */}
                      <div className="hidden md:block text-xs text-gray-400">
                        {new Date(req.created_at).toLocaleString('id-ID', {
                          day: '2-digit', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-1.5 w-full md:w-auto">
                        {req.status === 'pending' ? (
                          <Link
                            href={`/admin/verify/${req.id}`}
                            className="text-xs font-semibold px-3 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors text-center shadow-md animate-pulse"
                            style={{ animationDuration: '2s' }}
                          >
                            🛡️ Verifikasi Detail
                          </Link>
                        ) : (
                          <button
                            id={`detail-btn-${req.id}`}
                            onClick={() => setSelectedRequest(req)}
                            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors w-full text-center"
                          >
                            🔍 Lihat Data
                          </button>
                        )}
                        
                        {/* Only show manual actions if needed, or leave it to Command Center */}
                        {req.status === 'pending' && (
                           <ActionButtons request={req} onActionComplete={fetchRequests} />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <DetailModal
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
      />
    </div>
  )
}
