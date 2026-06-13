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
  description: string | null
  proof_url: string | null
  created_at: string
  profiles: { name: string; phone_number: string; sub_district: string | null } | null
}

type FilterStatus = 'all' | 'pending' | 'approved' | 'done' | 'rejected'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: string }> = {
  pending:  { label: 'Menunggu',    color: '#b45309', bg: '#fffbeb', border: '#fde68a', icon: '' },
  approved: { label: 'Dijadwalkan', color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', icon: '' },
  done:     { label: 'Selesai',     color: '#15803d', bg: '#dcfce7', border: '#86efac', icon: '' },
  rejected: { label: 'Ditolak',     color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', icon: '' },
}

// ── Rejection Note Modal ──────────────────────────────────────────────────────
function RejectModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (note: string) => void
  onCancel: () => void
}) {
  const [note, setNote] = useState('')
  const presets = [
    'Tidak memenuhi syarat donor',
    'Stok darah sudah mencukupi',
    'Jadwal penuh — coba lagi minggu depan',
    'Sedang dalam masa cooldown',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
            ❌
          </div>
          <div>
            <h2 className="font-display font-bold text-gray-900">Tolak Permintaan Donor</h2>
            <p className="text-xs text-gray-500">Berikan alasan penolakan (wajib)</p>
          </div>
        </div>

        {/* Preset notes */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Alasan Cepat</p>
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button key={p} type="button"
                onClick={() => setNote(p)}
                className="text-xs px-3 py-1.5 rounded-full border transition-all"
                style={note === p
                  ? { borderColor: '#dc2626', background: '#fef2f2', color: '#b91c1c', fontWeight: 700 }
                  : { borderColor: '#e5e7eb', color: '#6b7280' }}>
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom note */}
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Atau Tulis Alasan Sendiri</p>
          <textarea
            id="reject-note-input"
            rows={3}
            className="input-field resize-none"
            placeholder="Tuliskan alasan penolakan..."
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button type="button" onClick={onCancel}
            className="flex-1 text-sm font-semibold text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button type="button"
            onClick={() => { if (note.trim()) onConfirm(note.trim()) }}
            disabled={!note.trim()}
            className="flex-1 text-sm font-bold text-white px-4 py-2.5 rounded-xl disabled:opacity-40 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
            ✗ Konfirmasi Tolak
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Donation Card ─────────────────────────────────────────────────────────────
function DonationCard({
  d,
  onApprove,
  onReject,
  onDone,
  isProcessing,
}: {
  d: Donation
  onApprove: () => void
  onReject: () => void
  onDone: () => void
  isProcessing: boolean
}) {
  const cfg = STATUS_CONFIG[d.status]
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="card overflow-hidden" style={{ borderLeft: `4px solid ${cfg.color}` }}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Blood type badge */}
          <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
            style={{ background: 'var(--gradient-brand)', boxShadow: '0 3px 8px rgba(220,38,38,0.25)' }}>
            <span className="text-white font-display font-black text-sm leading-none">{d.blood_type}</span>
            <span className="text-red-200 font-bold text-[10px]">{d.rhesus}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900">{d.profiles?.name ?? 'Relawan'}</p>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                {cfg.icon} {cfg.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {d.bags_donated} kantong · {d.profiles?.phone_number ?? '—'}
              {d.profiles?.sub_district ? ` · ${d.profiles.sub_district}` : ''}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {new Date(d.created_at).toLocaleString('id-ID', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}
            </p>

            {/* Description (from volunteer) */}
            {d.description && (
              <div className="mt-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-0.5">Keterangan dari Relawan</p>
                <p className="text-xs text-blue-800">{d.description}</p>
              </div>
            )}

            {/* Admin notes */}
            {d.admin_notes && (
              <div className="mt-2 rounded-xl px-3 py-2"
                style={d.status === 'rejected'
                  ? { background: '#fef2f2', border: '1px solid #fca5a5' }
                  : { background: '#f0fdf4', border: '1px solid #86efac' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5"
                  style={{ color: d.status === 'rejected' ? '#b91c1c' : '#15803d' }}>
                  {d.status === 'rejected' ? '⚠️ Alasan Penolakan' : '📝 Catatan Admin'}
                </p>
                <p className="text-xs" style={{ color: d.status === 'rejected' ? '#991b1b' : '#166534' }}>
                  {d.admin_notes}
                </p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 flex-shrink-0">
            {d.status === 'pending' && (
              <>
                <button onClick={onApprove} disabled={isProcessing}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-blue-700 border border-blue-200 hover:bg-blue-50 disabled:opacity-50 transition-colors">
                  ✓ Setujui
                </button>
                <button onClick={onReject} disabled={isProcessing}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors">
                  ✗ Tolak
                </button>
              </>
            )}
            {d.status === 'approved' && (
              <button
                onClick={onDone}
                disabled={isProcessing || !d.proof_url}
                title={!d.proof_url ? 'Relawan belum upload bukti donor' : 'Tandai sebagai selesai'}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                style={d.proof_url
                  ? { background: 'linear-gradient(135deg, #16a34a, #15803d)' }
                  : { background: '#9ca3af' }}
              >
                {d.proof_url ? '🩸 Selesai' : '🔒 Tunggu Bukti'}
              </button>
            )}
          </div>
        </div>

        {/* ── Proof Section ── */}
        {(d.status === 'approved' || d.status === 'done') && (
          <div className="mt-3 rounded-xl overflow-hidden"
            style={d.proof_url
              ? { border: '1px solid #86efac', background: '#f0fdf4' }
              : { border: '1px solid #fde68a', background: '#fffbeb' }}
          >
            {d.proof_url ? (
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="text-green-600 text-lg">📄</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-green-700 uppercase tracking-wide">Bukti Donor Tersedia</p>
                  <p className="text-xs text-green-600 truncate">Foto sertifikat diunggah oleh relawan</p>
                </div>
                <a
                  href={d.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 text-xs font-bold text-green-700 underline"
                >
                  Lihat →
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-3 py-2.5">
                <span className="text-amber-500 text-lg">⏳</span>
                <div>
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Menunggu Bukti Donor</p>
                  <p className="text-xs text-amber-600">Relawan belum mengunggah foto sertifikat PMI/RS</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Expandable volunteer detail */}
        <button onClick={() => setExpanded(v => !v)}
          className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1">
          {expanded ? '▲ Sembunyikan Detail' : '▼ Lihat Detail Relawan'}
        </button>

        {expanded && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            {[
              { label: 'Goldar',     value: `${d.blood_type}${d.rhesus}` },
              { label: 'Kantong',    value: `${d.bags_donated}×` },
              { label: 'Kecamatan', value: d.profiles?.sub_district ?? '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-2.5">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="font-bold text-gray-800">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterStatus>('pending')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [rejectTarget, setRejectTarget] = useState<string | null>(null) // donation id being rejected

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
        : status === 'rejected'
        ? '❌ Permintaan donor telah ditolak dengan catatan.'
        : `Status diperbarui ke ${STATUS_CONFIG[status]?.label ?? status}`)
      await fetchDonations()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal update')
    } finally {
      setActionLoading(null)
      setTimeout(() => setSuccess(null), 4000)
    }
  }

  const counts = {
    all:      donations.length,
    pending:  donations.filter(d => d.status === 'pending').length,
    approved: donations.filter(d => d.status === 'approved').length,
    done:     donations.filter(d => d.status === 'done').length,
    rejected: donations.filter(d => d.status === 'rejected').length,
  }

  const filtered = filter === 'all' ? donations : donations.filter(d => d.status === filter)

  return (
    <>
      {/* Rejection Modal */}
      {rejectTarget && (
        <RejectModal
          onCancel={() => setRejectTarget(null)}
          onConfirm={note => {
            const id = rejectTarget
            setRejectTarget(null)
            handleAction(id, 'rejected', note)
          }}
        />
      )}

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
          {(['all', 'pending', 'approved', 'done', 'rejected'] as FilterStatus[]).map(f => {
            const cnt = counts[f]
            const isActive = filter === f
            return (
              <button key={f} onClick={() => setFilter(f)}
                id={`filter-donasi-${f}`}
                className="text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                style={isActive
                  ? { background: 'var(--gradient-brand)', color: 'white', boxShadow: '0 2px 8px rgba(220,38,38,0.25)' }
                  : { background: 'white', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                {f === 'all' ? '📋 Semua' : `${STATUS_CONFIG[f]?.icon} ${STATUS_CONFIG[f]?.label}`}
                {` (${cnt})`}
              </button>
            )
          })}
        </div>

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
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
            <p className="font-semibold text-gray-700">Tidak ada donasi dengan status ini</p>
            <p className="text-sm text-gray-400 mt-1">Relawan dapat mengajukan via dashboard mereka.</p>
          </div>
        )}

        {/* Donation List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(d => (
              <DonationCard
                key={d.id}
                d={d}
                isProcessing={actionLoading === d.id}
                onApprove={() => handleAction(d.id, 'approved')}
                onReject={() => setRejectTarget(d.id)}
                onDone={() => handleAction(d.id, 'done')}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
