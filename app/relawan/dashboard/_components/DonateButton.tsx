'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

interface DonationRecord {
  id: string
  status: 'pending' | 'approved' | 'done' | 'rejected'
  bags_donated: number
  admin_notes: string | null
  description: string | null
  created_at: string
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; border: string; emoji: string; description: string }> = {
  pending:  {
    label: 'Menunggu Persetujuan', color: '#b45309', bg: '#fffbeb', border: '#fde68a', emoji: '⏳',
    description: 'Admin akan memproses permintaan Anda segera.',
  },
  approved: {
    label: 'Dijadwalkan',          color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe', emoji: '📅',
    description: 'Permintaan disetujui. Hubungi PMI untuk jadwal donor.',
  },
  done:     {
    label: 'Selesai',              color: '#15803d', bg: '#dcfce7', border: '#86efac', emoji: '✅',
    description: 'Donasi berhasil! Terima kasih atas kontribusi Anda.',
  },
  rejected: {
    label: 'Ditolak',              color: '#b91c1c', bg: '#fef2f2', border: '#fca5a5', emoji: '❌',
    description: 'Permintaan tidak dapat diproses saat ini.',
  },
}

export function DonateButton({
  canDonate,
  cooldownRemaining,
}: {
  canDonate: boolean
  cooldownRemaining: number
}) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)
  const [donations, setDonations] = useState<DonationRecord[]>([])
  const [loadingDonations, setLoadingDonations] = useState(true)
  const [description, setDescription] = useState('')
  const [showForm, setShowForm] = useState(false)

  // Subscribe to realtime updates on volunteer_donations
  useEffect(() => {
    let mounted = true
    async function load() {
      try {
        const res = await fetch('/api/v1/volunteer/donations')
        const json = await res.json()
        if (mounted) setDonations(json.donations ?? [])
      } catch { /* ignore */ }
      if (mounted) setLoadingDonations(false)
    }
    load()

    // Realtime — listen for status changes on own donations
    const supabase = getSupabase()
    const channel = supabase
      .channel('volunteer-donations-watch')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'volunteer_donations' }, () => {
        load()
      })
      .subscribe()

    return () => {
      mounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  const hasActive = donations.some(d => d.status === 'pending' || d.status === 'approved')
  const canSubmit = canDonate && !hasActive

  const handleDonate = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/v1/volunteer/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bags_donated: 1, description: description.trim() || undefined }),
      })
      const json = await res.json()
      if (!res.ok) {
        setResult({ ok: false, msg: json.error ?? 'Gagal mengajukan donasi' })
      } else {
        setResult({ ok: true, msg: 'Permintaan donor berhasil dikirim! Admin akan segera menghubungi Anda.' })
        setDescription('')
        setShowForm(false)
        // Refresh donation list
        const res2 = await fetch('/api/v1/volunteer/donations')
        const json2 = await res2.json()
        setDonations(json2.donations ?? [])
      }
    } catch {
      setResult({ ok: false, msg: 'Terjadi kesalahan. Coba lagi.' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      {/* ── Action Card ── */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: canSubmit
                ? 'var(--gradient-brand)'
                : 'linear-gradient(135deg, #9ca3af, #6b7280)',
              boxShadow: canSubmit
                ? '0 4px 12px rgba(220,38,38,0.3)'
                : '0 4px 12px rgba(107,114,128,0.2)',
            }}
          >
            <span className="text-white text-2xl">🩸</span>
          </div>
          <div className="flex-1">
            <h2 className="font-display font-bold text-gray-900">Ingin Donor Hari Ini?</h2>
            <p className="text-sm text-gray-500">
              {!canDonate
                ? `Anda masih dalam masa cooldown. ${cooldownRemaining} hari lagi.`
                : hasActive
                ? 'Anda sudah punya permintaan donor aktif.'
                : 'Beritahu admin bahwa Anda siap donor hari ini.'}
            </p>
          </div>
          {canSubmit && !showForm && (
            <button
              id="show-donate-form-btn"
              onClick={() => setShowForm(true)}
              className="btn-primary px-5 py-2.5 whitespace-nowrap"
              style={{ width: 'auto' }}
            >
              🤲 Ajukan Donor
            </button>
          )}
          {!canSubmit && (
            <button
              disabled
              className="btn-primary px-5 py-2.5 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ width: 'auto' }}
            >
              🤲 Ajukan Donor
            </button>
          )}
        </div>

        {/* ── Donation Form (description) ── */}
        {showForm && canSubmit && (
          <div className="mt-5 border-t border-gray-100 pt-5 space-y-4">
            <div>
              <label htmlFor="donate-description" className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
                Keterangan Tambahan <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <textarea
                id="donate-description"
                rows={2}
                className="input-field resize-none"
                placeholder="Contoh: saya tersedia pukul 09.00–12.00, atau ada kondisi khusus yang perlu diketahui admin..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                Keterangan ini akan dikirim ke Admin UTD Bank Darah untuk membantu proses penjadwalan.
              </p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowForm(false); setDescription('') }}
                className="flex-1 text-sm font-semibold text-gray-600 border border-gray-200 px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                Batal
              </button>
              <button
                id="submit-donate-btn"
                type="button"
                onClick={handleDonate}
                disabled={loading || loadingDonations}
                className="flex-1 btn-primary py-2.5 disabled:opacity-40"
              >
                {loading ? <><span className="spinner" /> Mengirim...</> : '🤲 Kirim Permintaan'}
              </button>
            </div>
          </div>
        )}

        {result && (
          <div
            className="mt-4 px-4 py-3 rounded-xl text-sm font-medium"
            style={{
              background: result.ok ? '#dcfce7' : '#fef2f2',
              color: result.ok ? '#166534' : '#991b1b',
              border: `1px solid ${result.ok ? '#86efac' : '#fca5a5'}`,
            }}
          >
            {result.ok ? '✅' : '⚠️'} {result.msg}
          </div>
        )}
      </div>

      {/* ── Donation History ── */}
      {donations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-display font-bold text-gray-900">Riwayat Donasi Saya</h2>
            <span className="text-xs text-gray-400">{donations.length} pengajuan</span>
          </div>
          <div className="divide-y divide-gray-50">
            {donations.map(d => {
              const cfg = STATUS_CFG[d.status]
              return (
                <div key={d.id} className="px-5 py-4" style={{ borderLeft: `3px solid ${cfg.color}` }}>
                  {/* Status row */}
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base">{cfg.emoji}</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400">{d.bags_donated} kantong</span>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(d.created_at).toLocaleDateString('id-ID', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Status description */}
                  <p className="text-xs text-gray-500 mb-1">{cfg.description}</p>

                  {/* Volunteer's own description */}
                  {d.description && (
                    <div className="mt-2 bg-gray-50 rounded-xl px-3 py-2">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Keterangan Anda</p>
                      <p className="text-xs text-gray-600 italic">{d.description}</p>
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
                        {d.status === 'rejected' ? '⚠️ Alasan Penolakan dari Admin' : '📝 Catatan Admin'}
                      </p>
                      <p className="text-xs font-medium" style={{ color: d.status === 'rejected' ? '#991b1b' : '#166534' }}>
                        {d.admin_notes}
                      </p>
                    </div>
                  )}

                  {/* No note on rejection fallback */}
                  {d.status === 'rejected' && !d.admin_notes && (
                    <div className="mt-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                      <p className="text-xs text-red-600">
                        ⚠️ Permintaan donor ditolak. Hubungi admin untuk informasi lebih lanjut.
                      </p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
