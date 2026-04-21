'use client'

import { useEffect, useRef } from 'react'
import Image from 'next/image'

type RequestStatus = 'pending' | 'approved' | 'completed' | 'rejected'

interface DetailRequest {
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

interface DetailModalProps {
  request: DetailRequest | null
  onClose: () => void
}

const STATUS_MAP: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  pending:   { label: 'Menunggu Verifikasi', color: '#92400e', bg: '#fef3c7' },
  approved:  { label: 'Disetujui',           color: '#166534', bg: '#dcfce7' },
  completed: { label: 'Selesai',             color: '#1d4ed8', bg: '#dbeafe' },
  rejected:  { label: 'Ditolak',             color: '#991b1b', bg: '#fee2e2' },
}

export function DetailModal({ request, onClose }: DetailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  // Open/close the <dialog> element
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (request) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [request])

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  if (!request) return null

  const hospital = request.hospitals
  const status = STATUS_MAP[request.status] ?? STATUS_MAP.pending
  const isImage = request.proof_url
    ? /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(request.proof_url)
    : false

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      id={`detail-modal-${request.id}`}
      className="w-full max-w-2xl rounded-2xl p-0 border-0 shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      style={{ maxHeight: '90vh', overflowY: 'auto' }}
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white"
        style={{ borderRadius: '1rem 1rem 0 0' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl gradient-brand flex flex-col items-center justify-center"
            style={{ boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
          >
            <span className="text-white font-display font-black text-base leading-none">
              {request.blood_type}
            </span>
            <span className="text-red-200 font-bold text-xs">{request.rhesus}</span>
          </div>
          <div>
            <h2 className="font-display font-bold text-gray-900">{request.patient_name}</h2>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ color: status.color, background: status.bg }}
            >
              {status.label}
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          id="close-modal-btn"
          className="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-lg font-bold"
          aria-label="Tutup"
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5 bg-white" style={{ borderRadius: '0 0 1rem 1rem' }}>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Nomor Kontak',  value: request.contact_phone },
            { label: 'Golongan Darah', value: `${request.blood_type}${request.rhesus}` },
            { label: 'Dibutuhkan',    value: `${request.bags_needed} kantong` },
            { label: 'Terpenuhi',     value: `${request.bags_fulfilled} kantong` },
            { label: 'Tanggal Masuk', value: new Date(request.created_at).toLocaleString('id-ID', {
              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })},
            ...(request.admin_notes ? [{ label: 'Catatan Admin', value: request.admin_notes }] : []),
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
              <p className="text-sm font-semibold text-gray-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Hospital Info */}
        {hospital && (
          <div className="bg-red-50 border border-red-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1">Rumah Sakit Tujuan</p>
            <p className="font-bold text-gray-900">{hospital.name}</p>
            <p className="text-sm text-gray-500 mt-0.5">{hospital.address}</p>
            {hospital.phone && (
              <p className="text-sm text-gray-500">{hospital.phone}</p>
            )}
          </div>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Progress Terpenuhi</span>
            <span className="font-bold text-gray-700">
              {request.bags_fulfilled} / {request.bags_needed} kantong
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, Math.round(request.bags_fulfilled / Math.max(1, request.bags_needed) * 100))}%`,
                background: request.bags_fulfilled >= request.bags_needed
                  ? '#16a34a'
                  : 'linear-gradient(90deg, #dc2626, #b91c1c)',
              }}
            />
          </div>
        </div>

        {/* Medical Proof */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
            Bukti Surat Pengantar RS
          </p>
          {request.proof_url ? (
            <div className="rounded-xl overflow-hidden border border-gray-200">
              {isImage ? (
                <a href={request.proof_url} target="_blank" rel="noopener noreferrer">
                  <div className="relative w-full h-64 bg-gray-100">
                    <Image
                      src={request.proof_url}
                      alt="Surat pengantar RS"
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="bg-gray-50 px-4 py-2 text-xs text-blue-600 font-medium text-center hover:bg-blue-50 transition-colors">
                    🔍 Klik untuk buka gambar penuh
                  </div>
                </a>
              ) : (
                <a
                  href={request.proof_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-3xl">📄</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">Lihat Dokumen Bukti</p>
                    <p className="text-xs text-gray-400 truncate max-w-xs">{request.proof_url}</p>
                  </div>
                </a>
              )}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-200 px-6 py-8 text-center">
              <p className="text-gray-400 text-3xl mb-1">📷</p>
              <p className="text-sm text-gray-500">Belum ada bukti yang diunggah</p>
            </div>
          )}
        </div>
      </div>
    </dialog>
  )
}
