'use client'

import { useState, useEffect } from 'react'
import { getSupabase } from '@/lib/supabaseClient'

interface DonationRecord {
  id: string
  status: 'pending' | 'approved' | 'done' | 'rejected'
  bags_donated: number
  admin_notes: string | null
  created_at: string
}

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  pending:  { label: 'Menunggu Persetujuan', color: '#d97706', bg: '#fffbeb', emoji: '⏳' },
  approved: { label: 'Dijadwalkan',          color: '#2563eb', bg: '#eff6ff', emoji: '📅' },
  done:     { label: 'Selesai',              color: '#16a34a', bg: '#dcfce7', emoji: '✅' },
  rejected: { label: 'Ditolak',              color: '#dc2626', bg: '#fef2f2', emoji: '❌' },
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

  // Check for existing active donation
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/volunteer/donations')
        const json = await res.json()
        setDonations(json.donations ?? [])
      } catch { /* ignore */ }
      setLoadingDonations(false)
    }
    load()
  }, [])

  const hasActive = donations.some((d) => d.status === 'pending' || d.status === 'approved')

  const handleDonate = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/v1/volunteer/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bags_donated: 1 }),
      })
      const json = await res.json()
      if (!res.ok) {
        setResult({ ok: false, msg: json.error ?? 'Gagal mengajukan donasi' })
      } else {
        setResult({ ok: true, msg: 'Permintaan donor berhasil dikirim! Admin akan segera menghubungi Anda.' })
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
      {/* Action Card */}
      <div className="card p-6">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: canDonate && !hasActive
                ? 'var(--gradient-brand)'
                : 'linear-gradient(135deg, #9ca3af, #6b7280)',
              boxShadow: canDonate && !hasActive
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
          <button
            onClick={handleDonate}
            disabled={!canDonate || hasActive || loading || loadingDonations}
            className="btn-primary px-5 py-2.5 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {loading ? (
              <><span className="spinner" /> Mengirim...</>
            ) : (
              '🤲 Ajukan Donor'
            )}
          </button>
        </div>

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

      {/* Donation History */}
      {donations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-display font-bold text-gray-900">Riwayat Donasi Saya</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {donations.map((d) => {
              const cfg = STATUS_CFG[d.status]
              return (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-lg">{cfg?.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-full"
                        style={{ background: cfg?.bg, color: cfg?.color }}
                      >
                        {cfg?.label}
                      </span>
                      <span className="text-xs text-gray-400">
                        {d.bags_donated} kantong
                      </span>
                    </div>
                    {d.admin_notes && (
                      <p className="text-xs text-gray-400 mt-0.5 italic">📝 {d.admin_notes}</p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(d.created_at).toLocaleDateString('id-ID', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
