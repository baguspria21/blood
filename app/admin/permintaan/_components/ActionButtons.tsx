'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

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
  hospitals: { name: string; address: string } | null
}

interface ActionButtonsProps {
  request: BloodRequest
  onActionComplete?: () => void
}

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Menunggu',  color: '#92400e', bg: '#fef3c7' },
  approved:  { label: 'Disetujui', color: '#166534', bg: '#dcfce7' },
  completed: { label: 'Selesai',   color: '#1d4ed8', bg: '#dbeafe' },
  rejected:  { label: 'Ditolak',   color: '#991b1b', bg: '#fee2e2' },
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {cfg.label}
    </span>
  )
}

export function ActionButtons({ request, onActionComplete }: ActionButtonsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)
  const [notes, setNotes] = useState('')
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (request.status !== 'pending') {
    return <span className="text-xs text-gray-400 italic">Sudah diproses</span>
  }

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !notes.trim()) {
      setError('Alasan penolakan wajib diisi.')
      return
    }
    setLoading(action)
    setError(null)

    try {
      const res = await fetch(`/api/v1/admin/requests/${request.id}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: notes.trim() }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Terjadi kesalahan.')

      // Notify parent to refetch (client) or fall back to router refresh (server)
      if (onActionComplete) {
        onActionComplete()
      } else {
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses permintaan.')
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p className="text-xs text-red-600 font-medium">{error}</p>
      )}

      {showRejectForm ? (
        <div className="flex flex-col gap-1.5">
          <textarea
            className="input-field text-xs resize-none"
            rows={2}
            placeholder="Alasan penolakan (wajib)..."
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setError(null) }}
          />
          <div className="flex gap-1.5">
            <button
              onClick={() => handleAction('reject')}
              disabled={loading === 'reject'}
              className="flex-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 transition-colors"
            >
              {loading === 'reject' ? 'Menolak...' : 'Konfirmasi Tolak'}
            </button>
            <button
              onClick={() => { setShowRejectForm(false); setNotes(''); setError(null) }}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          {/* Quick approve removed; admins must use Verification Command Center */}
          <button
            id={`reject-btn-${request.id}`}
            onClick={() => setShowRejectForm(true)}
            className="flex-1 text-xs font-bold px-3 py-2 rounded-lg text-red-600 border-2 border-red-200 hover:bg-red-50 transition-colors"
          >
            ✗ Tolak Cepat
          </button>
        </div>
      )}
    </div>
  )
}
