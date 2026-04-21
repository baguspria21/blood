'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface Donation {
  id: string
  volunteer_id: string
  blood_type: string
  rhesus: string
  status: 'pending' | 'approved' | 'done' | 'rejected'
  bags_donated: number
  admin_notes: string | null
  created_at: string
  profiles: { name: string } | null
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'done' | 'rejected'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Menunggu',  color: '#d97706', bg: '#fffbeb' },
  approved: { label: 'Dijadwalkan', color: '#2563eb', bg: '#eff6ff' },
  done:     { label: 'Selesai',   color: '#16a34a', bg: '#dcfce7' },
  rejected: { label: 'Ditolak',   color: '#dc2626', bg: '#fef2f2' },
}

export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchDonations = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/donations')
      const json = await res.json()
      setDonations(json.donations ?? [])
    } catch {
      setError('Gagal memuat data donasi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDonations() }, [fetchDonations])

  const handleAction = async (id: string, status: string, adminNotes?: string) => {
    setActionLoading(id)
    setError(null)
    try {
      const res = await fetch(`/api/v1/admin/donations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: adminNotes }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Gagal')
      setSuccess(status === 'done'
        ? '✅ Donasi selesai — stok darah otomatis bertambah!'
        : `Status diperbarui ke ${STATUS_CONFIG[status]?.label ?? status}`)
      await fetchDonations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal update')
    } finally {
      setActionLoading(null)
      setTimeout(() => setSuccess(null), 4000)
    }
  }

  const filtered = filter === 'all' ? donations : donations.filter((d) => d.status === filter)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Donasi Sukarela</h1>
          <p className="text-gray-500 text-sm">Kelola permintaan donor dari relawan</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-red-600 transition-colors">
          ← Dashboard
        </Link>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium text-green-800"
          style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
          {success}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'approved', 'done', 'rejected'] as FilterStatus[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-sm font-semibold px-4 py-2 rounded-xl transition-all ${
              filter === f
                ? 'text-white shadow-md'
                : 'text-gray-600 bg-white border border-gray-200 hover:border-red-200'
            }`}
            style={filter === f ? { background: 'var(--gradient-brand)' } : {}}
          >
            {f === 'all' ? '📋 Semua' : `${STATUS_CONFIG[f]?.label ?? f}`}
            {f !== 'all' && ` (${donations.filter((d) => d.status === f).length})`}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="card px-6 py-14 text-center">
          <p className="text-4xl mb-3">📭</p>
          <p className="font-semibold text-gray-700">Belum ada donasi sukarela</p>
          <p className="text-sm text-gray-400 mt-1">Relawan dapat mengajukan via dashboard mereka.</p>
        </div>
      )}

      {/* Donation List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((d) => {
            const cfg = STATUS_CONFIG[d.status]
            const isProcessing = actionLoading === d.id
            return (
              <div key={d.id} className="card p-5">
                <div className="flex items-start gap-4">
                  {/* Blood type badge */}
                  <div
                    className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: 'var(--gradient-brand)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}
                  >
                    <span className="text-white font-display font-black text-sm leading-none">{d.blood_type}</span>
                    <span className="text-red-200 font-bold text-[10px]">{d.rhesus}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-gray-900 text-sm">{d.profiles?.name ?? 'Relawan'}</p>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg?.bg, color: cfg?.color }}
                      >
                        {cfg?.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {d.bags_donated} kantong · {new Date(d.created_at).toLocaleString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                    {d.admin_notes && (
                      <p className="text-xs text-gray-400 mt-1 italic">📝 {d.admin_notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {d.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAction(d.id, 'approved')}
                          disabled={isProcessing}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-blue-600 border border-blue-200 hover:bg-blue-50 disabled:opacity-50 transition-colors"
                        >
                          ✓ Setujui
                        </button>
                        <button
                          onClick={() => handleAction(d.id, 'rejected', 'Tidak memenuhi syarat')}
                          disabled={isProcessing}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          ✗ Tolak
                        </button>
                      </>
                    )}
                    {d.status === 'approved' && (
                      <button
                        onClick={() => handleAction(d.id, 'done')}
                        disabled={isProcessing}
                        className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-50 transition-colors"
                        style={{ background: '#16a34a' }}
                      >
                        🩸 Selesai Donor
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
