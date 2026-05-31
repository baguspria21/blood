'use client'

import { useState, useRef } from 'react'
import { SignaturePad, type SignaturePadHandle } from '../_components/SignaturePad'

// ── Types ──────────────────────────────────────────────────────────────────────
interface TransfusionRequest {
  id: string
  patient_name: string
  blood_type: string | null
  rhesus: string | null
  requesting_hospital: string | null
  requesting_doctor: string | null
  bagian: string | null
  kelas: string | null
  diagnosis: string | null
  request_date: string | null
  needed_date: string | null
  contact_phone: string
  hemoglobin: number | null
  status: string
  rejection_notes?: string | null
  wb_fresh_volume: number | null
  wb_new_volume: number | null
  wb_regular_volume: number | null
  prc_fresh_volume: number | null
  prc_regular_volume: number | null
  prc_washed_volume: number | null
  plasma_regular_volume: number | null
  plasma_ffp_volume: number | null
  factor_thrombocyte_bags: number | null
  factor_cryoprecipitate_bags: number | null
  factor_buffycoat_bags: number | null
  factor_other: string | null
}

interface TransfusionResponse {
  id: string
  bag_number: string
  collection_date: string | null
  blood_category: string | null
  volume_cc: string | null
  blood_type_abo: string | null
  rhesus: string | null
  officer_name: string | null
  release_date: string | null
  release_time: string | null
  receiver_name: string | null
  created_at: string
}

interface Props {
  request: TransfusionRequest
  existingResponses: TransfusionResponse[]
}

// ── BagRow type (local state only, no id in DB) ───────────────────────────────
interface BagRow {
  _id: string          // local key only, never sent to API
  bag_number: string
  collection_date: string
  blood_category: string
  volume_cc: string
}

// ── Build dropdown options strictly from what the hospital requested ───────────
interface ProductOption {
  value: string   // stored in blood_category column
  label: string   // display in dropdown
  hint: string    // qty hint shown in option
}

function getRequestedProductOptions(req: TransfusionRequest): ProductOption[] {
  const opts: ProductOption[] = []
  if (req.wb_fresh_volume)           opts.push({ value: 'WB Segar',                label: 'WB Segar',                hint: `${req.wb_fresh_volume} cc` })
  if (req.wb_new_volume)             opts.push({ value: 'WB Baru',                 label: 'WB Baru',                 hint: `${req.wb_new_volume} cc` })
  if (req.wb_regular_volume)         opts.push({ value: 'WB Biasa',                label: 'WB Biasa',                hint: `${req.wb_regular_volume} cc` })
  if (req.prc_fresh_volume)          opts.push({ value: 'PRC Segar',               label: 'PRC Segar',               hint: `${req.prc_fresh_volume} cc` })
  if (req.prc_regular_volume)        opts.push({ value: 'PRC Biasa',               label: 'PRC Biasa',               hint: `${req.prc_regular_volume} cc` })
  if (req.prc_washed_volume)         opts.push({ value: 'PRC Cuci',                label: 'PRC Cuci (Washed)',       hint: `${req.prc_washed_volume} cc` })
  if (req.plasma_regular_volume)     opts.push({ value: 'Plasma Biasa',            label: 'Plasma Biasa',            hint: `${req.plasma_regular_volume} cc` })
  if (req.plasma_ffp_volume)         opts.push({ value: 'FFP',                     label: 'FFP',                     hint: `${req.plasma_ffp_volume} cc` })
  if (req.factor_thrombocyte_bags)   opts.push({ value: 'Thrombocyte Concentrate', label: 'Thrombocyte Concentrate', hint: `${req.factor_thrombocyte_bags} ktg` })
  if (req.factor_cryoprecipitate_bags) opts.push({ value: 'Cryoprecipitate',       label: 'Cryoprecipitate – AHV',  hint: `${req.factor_cryoprecipitate_bags} ktg` })
  if (req.factor_buffycoat_bags)     opts.push({ value: 'Buffy Coat',              label: 'Buffy Coat',              hint: `${req.factor_buffycoat_bags} ktg` })
  if (req.factor_other)              opts.push({ value: req.factor_other,           label: req.factor_other,          hint: 'lain-lain' })
  return opts
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
      {children}{required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-sm font-semibold text-gray-800 mt-0.5">{value || '—'}</p>
    </div>
  )
}

function BloodProductsRequested({ req }: { req: TransfusionRequest }) {
  const products = [
    req.wb_fresh_volume && `WB Segar: ${req.wb_fresh_volume} cc`,
    req.wb_new_volume && `WB Baru: ${req.wb_new_volume} cc`,
    req.wb_regular_volume && `WB Biasa: ${req.wb_regular_volume} cc`,
    req.prc_fresh_volume && `PRC Segar: ${req.prc_fresh_volume} cc`,
    req.prc_regular_volume && `PRC Biasa: ${req.prc_regular_volume} cc`,
    req.prc_washed_volume && `PRC Cuci: ${req.prc_washed_volume} cc`,
    req.plasma_regular_volume && `Plasma: ${req.plasma_regular_volume} cc`,
    req.plasma_ffp_volume && `FFP: ${req.plasma_ffp_volume} cc`,
    req.factor_thrombocyte_bags && `Trombosit: ${req.factor_thrombocyte_bags} ktg`,
    req.factor_cryoprecipitate_bags && `Cryo: ${req.factor_cryoprecipitate_bags} ktg`,
    req.factor_buffycoat_bags && `Buffy Coat: ${req.factor_buffycoat_bags} ktg`,
    req.factor_other,
  ].filter(Boolean)

  if (products.length === 0) return <p className="text-sm text-gray-400">—</p>
  return (
    <div className="flex flex-wrap gap-2">
      {products.map((p, i) => (
        <span key={i} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-100">{p}</span>
      ))}
    </div>
  )
}

function AvailabilityToggle({ available, onChange }: { available: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-3 mb-6">
      <button type="button" id="blood-available-btn" onClick={() => onChange(true)}
        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
          available ? 'border-green-500 bg-green-600 text-white shadow-sm' : 'border-gray-200 text-gray-500 hover:border-green-200 hover:text-green-600'
        }`}>
        ✅ Darah Tersedia
      </button>
      <button type="button" id="blood-unavailable-btn" onClick={() => onChange(false)}
        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm border-2 transition-all flex items-center justify-center gap-2 ${
          !available ? 'border-red-500 bg-red-600 text-white shadow-sm' : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-600'
        }`}>
        ❌ Tidak Tersedia
      </button>
    </div>
  )
}

// ── Bag row component ──────────────────────────────────────────────────────────
function BagRowInput({
  index,
  row,
  productOptions,
  canRemove,
  today,
  onChange,
  onRemove,
}: {
  index: number
  row: BagRow
  productOptions: ProductOption[]
  canRemove: boolean
  today: string
  onChange: (id: string, field: keyof BagRow, value: string) => void
  onRemove: (id: string) => void
}) {
  return (
    <div
      className="rounded-2xl border border-gray-200 overflow-hidden transition-shadow hover:shadow-sm"
      style={{ background: index % 2 === 0 ? '#fafafa' : '#fff' }}
    >
      {/* Row header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100"
        style={{ background: 'linear-gradient(135deg, #fef2f2, #fff5f5)' }}>
        <span className="text-xs font-bold text-red-700 flex items-center gap-2">
          <span
            className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-black"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          >
            {index + 1}
          </span>
          Kantong #{index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            id={`remove-bag-${index}-btn`}
            onClick={() => onRemove(row._id)}
            className="text-xs font-semibold text-gray-400 hover:text-red-600 transition-colors flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-50"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            Hapus
          </button>
        )}
      </div>

      {/* Row fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
        {/* Nomor Kantong */}
        <div>
          <Label required>No. Kantong</Label>
          <input
            id={`bag-number-${index}`}
            type="text"
            className="input-field font-mono font-bold text-sm"
            placeholder="UTD-2024-001"
            value={row.bag_number}
            onChange={e => onChange(row._id, 'bag_number', e.target.value)}
          />
        </div>

        {/* Jenis Produk — restricted to what was requested */}
        <div>
          <Label required>Jenis Produk Darah</Label>
          {productOptions.length > 0 ? (
            <select
              id={`blood-category-${index}`}
              className="input-field text-sm"
              value={row.blood_category}
              onChange={e => onChange(row._id, 'blood_category', e.target.value)}
            >
              <option value="">-- Pilih Jenis --</option>
              {productOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.hint})
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`blood-category-${index}`}
              type="text"
              className="input-field text-sm"
              placeholder="Jenis produk darah"
              value={row.blood_category}
              onChange={e => onChange(row._id, 'blood_category', e.target.value)}
            />
          )}
        </div>

        {/* Volume */}
        <div>
          <Label>Volume (cc / Kantong)</Label>
          <input
            id={`volume-cc-${index}`}
            type="text"
            className="input-field text-sm"
            placeholder="e.g. 250 cc"
            value={row.volume_cc}
            onChange={e => onChange(row._id, 'volume_cc', e.target.value)}
          />
        </div>

        {/* Tanggal Pengambilan */}
        <div>
          <Label>Tgl Ambil</Label>
          <input
            id={`collection-date-${index}`}
            type="date"
            className="input-field text-sm"
            value={row.collection_date}
            onChange={e => onChange(row._id, 'collection_date', e.target.value)}
          />
        </div>
      </div>
    </div>
  )
}

// ── Signature Modal ────────────────────────────────────────────────────────────
interface SignatureModalProps {
  isAvailable: boolean
  bagCount: number
  officerSigRef: React.RefObject<SignaturePadHandle | null>
  receiverSigRef: React.RefObject<SignaturePadHandle | null>
  receiverName: string
  onReceiverNameChange: (v: string) => void
  onConfirm: () => void
  onClose: () => void
  submitting: boolean
}

function SignatureModal({
  isAvailable,
  bagCount,
  officerSigRef,
  receiverSigRef,
  receiverName,
  onReceiverNameChange,
  onConfirm,
  onClose,
  submitting,
}: SignatureModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
        >
          <div>
            <h3 className="font-display font-bold text-white text-lg">✍️ Tanda Tangan</h3>
            <p className="text-red-200 text-xs mt-0.5">
              {isAvailable
                ? `Konfirmasi ${bagCount} kantong darah — Petugas PMI & Pengambil Darah`
                : 'Tanda tangan Petugas PMI sebagai bukti verifikasi stok'}
            </p>
          </div>
          <button
            type="button"
            id="close-sig-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* A: PMI Officer signature — always */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' }}>A</span>
              <p className="text-sm font-bold text-gray-800">
                Tanda Tangan Petugas PMI
                {!isAvailable && <span className="ml-2 text-xs font-normal text-gray-500">(Verifikasi stok habis)</span>}
              </p>
            </div>
            <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 p-3">
              <p className="text-[10px] text-gray-400 font-medium mb-2">✍️ Tanda tangan petugas ATD/PTTD yang bertugas:</p>
              <SignaturePad ref={officerSigRef} id="officer-sig-canvas" />
            </div>
          </div>

          {/* B: Receiver — only when blood is available */}
          {isAvailable && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>B</span>
                <p className="text-sm font-bold text-gray-800">Tanda Tangan Pengambil Darah</p>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Nama Pengambil Darah (Keluarga / Petugas RS)</Label>
                  <input
                    id="receiver-name-modal-input"
                    type="text"
                    className="input-field"
                    placeholder="Nama lengkap pengambil darah"
                    value={receiverName}
                    onChange={e => onReceiverNameChange(e.target.value)}
                  />
                </div>
                <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 p-3">
                  <p className="text-[10px] text-gray-400 font-medium mb-2">✍️ Tanda tangan pengambil darah:</p>
                  <SignaturePad ref={receiverSigRef} id="receiver-sig-canvas" />
                </div>
              </div>
            </div>
          )}

          {/* Confirm */}
          <button
            type="button"
            id="confirm-signatures-btn"
            onClick={onConfirm}
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}
          >
            {submitting
              ? <><span className="spinner" /> Menyimpan...</>
              : isAvailable
                ? `💾 Simpan ${bagCount} Kantong & Konfirmasi Tanda Tangan`
                : '💾 Konfirmasi Status Tidak Tersedia'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Helper: generate unique row ID ────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2, 10)
}

function makeBagRow(defaultCategory: string, today: string): BagRow {
  return { _id: uid(), bag_number: '', collection_date: today, blood_category: defaultCategory, volume_cc: '' }
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function ResponseForm({ request, existingResponses }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toTimeString().slice(0, 5)

  // Derive the product options once
  const productOptions = getRequestedProductOptions(request)
  const defaultCategory = productOptions[0]?.value ?? ''

  // ── Availability mode ──────────────────────────────────────────────────────
  const [isAvailable, setIsAvailable] = useState(request.status !== 'rejected')
  const [rejectionNotes, setRejectionNotes] = useState(request.rejection_notes ?? '')
  const [sendingRejection, setSendingRejection] = useState(false)
  const [rejectionSent, setRejectionSent] = useState(request.status === 'rejected')

  // ── Global officer fields (shared across all bags) ─────────────────────────
  const [officer, setOfficer] = useState({
    officer_name: '',
    release_date: today,
    release_time: now,
    blood_type_abo: request.blood_type ?? '',
    rhesus: request.rhesus === '+' ? 'Positif' : request.rhesus === '-' ? 'Negatif' : '',
  })
  const updateOfficer = (key: keyof typeof officer, value: string) =>
    setOfficer(prev => ({ ...prev, [key]: value }))

  // ── Field array: bag rows ──────────────────────────────────────────────────
  const [bags, setBags] = useState<BagRow[]>([makeBagRow(defaultCategory, today)])

  const addBag = () =>
    setBags(prev => [...prev, makeBagRow(defaultCategory, today)])

  const removeBag = (id: string) =>
    setBags(prev => prev.length > 1 ? prev.filter(b => b._id !== id) : prev)

  const updateBag = (id: string, field: keyof BagRow, value: string) =>
    setBags(prev => prev.map(b => b._id === id ? { ...b, [field]: value } : b))

  // ── Receiver name & signatures ─────────────────────────────────────────────
  const [receiverName, setReceiverName] = useState('')
  const officerSigRef = useRef<SignaturePadHandle>(null)
  const receiverSigRef = useRef<SignaturePadHandle>(null)

  // ── UI state ───────────────────────────────────────────────────────────────
  const [showSignModal, setShowSignModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState(0)
  const [responses, setResponses] = useState<TransfusionResponse[]>(existingResponses)
  const [markingDone, setMarkingDone] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(request.status)

  const BLOOD_TYPES = ['A', 'B', 'AB', 'O']
  const RHESUS_OPTIONS = ['Positif', 'Negatif']
  const isFinished = currentStatus === 'completed' || (currentStatus === 'rejected' && rejectionSent)

  // ── Validate before opening modal ─────────────────────────────────────────
  const validateBags = (): string | null => {
    for (let i = 0; i < bags.length; i++) {
      if (!bags[i].bag_number.trim()) return `Nomor kantong #${i + 1} wajib diisi.`
      if (!bags[i].blood_category) return `Jenis produk kantong #${i + 1} wajib dipilih.`
    }
    return null
  }

  // ── Submit all bags at once ────────────────────────────────────────────────
  const handleSubmit = async () => {
    setError(null)
    setSubmitting(true)

    const officerSignature = officerSigRef.current?.getDataURL() ?? null
    const receiverSignature = receiverSigRef.current?.getDataURL() ?? null

    try {
      const res = await fetch('/api/v1/admin/transfusion-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfusion_request_id: request.id,
          // Global officer fields
          blood_type_abo:  officer.blood_type_abo || null,
          rhesus:          officer.rhesus || null,
          officer_name:    officer.officer_name || null,
          release_date:    officer.release_date || null,
          release_time:    officer.release_time || null,
          receiver_name:   receiverName || null,
          receiver_signature: receiverSignature,
          officer_signature: officerSignature,
          // Array of bag-specific fields
          bags: bags.map(b => ({
            bag_number:      b.bag_number.trim(),
            collection_date: b.collection_date || null,
            blood_category:  b.blood_category || null,
            volume_cc:       b.volume_cc || null,
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal menyimpan.')

      // Prepend all inserted rows to the table
      const newRows: TransfusionResponse[] = json.responses ?? (json.response ? [json.response] : [])
      setResponses(prev => [...newRows, ...prev])
      setSuccessCount(c => c + newRows.length)
      setCurrentStatus('approved')
      setShowSignModal(false)

      // Reset for next batch
      setBags([makeBagRow(defaultCategory, today)])
      setReceiverName('')
      officerSigRef.current?.clear()
      receiverSigRef.current?.clear()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
      setShowSignModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Rejection ──────────────────────────────────────────────────────────────
  const handleSendRejection = async () => {
    setSendingRejection(true)
    setError(null)
    try {
      const officerSignature = officerSigRef.current?.getDataURL() ?? null
      const res = await fetch('/api/v1/admin/transfusion-responses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfusion_request_id: request.id,
          status: 'rejected',
          rejection_notes: rejectionNotes.trim() || 'Darah tidak tersedia.',
          officer_name: officer.officer_name || null,
          officer_signature: officerSignature,
        }),
      })
      if (!res.ok) throw new Error('Gagal mengirim status.')
      setCurrentStatus('rejected')
      setRejectionSent(true)
      setShowSignModal(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
      setShowSignModal(false)
    } finally {
      setSendingRejection(false)
    }
  }

  // ── Mark done ──────────────────────────────────────────────────────────────
  const handleMarkDone = async () => {
    setMarkingDone(true)
    try {
      const res = await fetch('/api/v1/admin/transfusion-responses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transfusion_request_id: request.id, status: 'completed' }),
      })
      if (res.ok) setCurrentStatus('completed')
    } finally {
      setMarkingDone(false)
    }
  }

  return (
    <>
      {/* ── Signature Modal ── */}
      {showSignModal && (
        <SignatureModal
          isAvailable={isAvailable}
          bagCount={bags.length}
          officerSigRef={officerSigRef}
          receiverSigRef={receiverSigRef}
          receiverName={receiverName}
          onReceiverNameChange={setReceiverName}
          onConfirm={() => isAvailable ? handleSubmit() : handleSendRejection()}
          onClose={() => setShowSignModal(false)}
          submitting={submitting || sendingRejection}
        />
      )}

      <div className="space-y-6">

        {/* ────────────────────────────────────────────────────────────
            CARD 1: Request Summary
        ──────────────────────────────────────────────────────────── */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900">{request.patient_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{request.requesting_hospital ?? 'RS tidak disebutkan'}</p>
            </div>
            <div className="flex items-center gap-2">
              {request.blood_type && (
                <span className="font-display text-2xl font-black text-white px-4 py-2 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.4)' }}>
                  {request.blood_type}{request.rhesus}
                </span>
              )}
              <span className={`text-sm font-bold px-3 py-1.5 rounded-lg ${
                currentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                currentStatus === 'approved'  ? 'bg-blue-100 text-blue-700'  :
                currentStatus === 'rejected'  ? 'bg-red-100 text-red-700'    : 'bg-amber-100 text-amber-700'
              }`}>
                {currentStatus === 'completed' ? '✓ Selesai' : currentStatus === 'approved' ? '● Diproses' :
                 currentStatus === 'rejected'  ? '✕ Ditolak' : '○ Menunggu'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <InfoRow label="Dokter"        value={request.requesting_doctor} />
            <InfoRow label="Bagian"        value={request.bagian} />
            <InfoRow label="Kelas"         value={request.kelas} />
            <InfoRow label="Kontak"        value={request.contact_phone} />
            <InfoRow label="Tgl Minta"     value={request.request_date    ? new Date(request.request_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'} />
            <InfoRow label="Tgl Diperlukan" value={request.needed_date    ? new Date(request.needed_date).toLocaleDateString('id-ID',  { dateStyle: 'medium' }) : '—'} />
            <InfoRow label="Diagnosa"      value={request.diagnosis} />
            <InfoRow label="Hb"            value={request.hemoglobin ? `${request.hemoglobin} g/%` : null} />
          </div>

          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Produk Darah Diminta</p>
            <BloodProductsRequested req={request} />
          </div>

          {currentStatus !== 'completed' && currentStatus !== 'rejected' && responses.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
              <p className="text-sm text-gray-600">
                <strong>{responses.length} kantong</strong> darah telah dicatat. Tandai sebagai selesai?
              </p>
              <button id="mark-done-btn" onClick={handleMarkDone} disabled={markingDone}
                className="text-sm font-bold text-white px-5 py-2 rounded-lg transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #15803d, #166534)' }}>
                {markingDone ? '...' : '✓ Tandai Selesai'}
              </button>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────────
            CARD 2: Existing Responses Table
        ──────────────────────────────────────────────────────────── */}
        {responses.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <h3 className="font-display font-bold text-gray-900">Data Kantong Darah yang Diberikan</h3>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{responses.length} kantong</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['No. Kantong', 'Tgl Ambil', 'Jenis', 'Volume', 'Gol.', 'Rh', 'Petugas', 'Penerima', 'Jam Keluar'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {responses.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 text-xs">{r.bag_number}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">{r.collection_date ? new Date(r.collection_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'}</td>
                      <td className="px-4 py-3"><span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700">{r.blood_category ?? '—'}</span></td>
                      <td className="px-4 py-3 font-semibold text-gray-800">{r.volume_cc ?? '—'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{r.blood_type_abo ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.rhesus ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.officer_name ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-700">{r.receiver_name ?? '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{r.release_date && r.release_time ? `${new Date(r.release_date).toLocaleDateString('id-ID', { dateStyle: 'short' })} ${r.release_time}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────
            CARD 3: Response Panel
        ──────────────────────────────────────────────────────────── */}
        {!isFinished && (
          <div className="card p-6">
            {/* Panel header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white text-sm font-bold"
                style={{ boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>✎</div>
              <div>
                <h3 className="font-display font-bold text-gray-900">Respons Permintaan</h3>
                <p className="text-xs text-gray-400">Pilih apakah darah tersedia atau tidak</p>
              </div>
            </div>

            <AvailabilityToggle available={isAvailable} onChange={v => { setIsAvailable(v); setError(null) }} />

            {error && <div className="alert alert-error mb-5">⚠️ {error}</div>}

            {/* ── Tidak Tersedia ── */}
            {!isAvailable && (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                  <p className="text-sm font-bold text-red-700 flex items-center gap-2">❌ Status: Darah Tidak Tersedia</p>
                  <div>
                    <Label>Nama Petugas PMI (untuk tanda tangan)</Label>
                    <input id="rejection-officer-name-input" type="text" className="input-field"
                      placeholder="Nama petugas ATD/PTTD" value={officer.officer_name}
                      onChange={e => updateOfficer('officer_name', e.target.value)} />
                  </div>
                  <div>
                    <Label>Keterangan / Alasan</Label>
                    <textarea id="rejection-notes-input" className="input-field" rows={4}
                      placeholder="Contoh: Stok golongan darah O+ habis..."
                      value={rejectionNotes} onChange={e => setRejectionNotes(e.target.value)} />
                  </div>
                </div>
                <button type="button" id="proceed-to-sign-rejection-btn"
                  onClick={() => setShowSignModal(true)}
                  className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)', boxShadow: '0 4px 14px rgba(185,28,28,0.3)' }}>
                  ✍️ Selesai &amp; Lanjut Tanda Tangan
                </button>
              </div>
            )}

            {/* ── Darah Tersedia ── */}
            {isAvailable && (
              <>
                {successCount > 0 && (
                  <div className="alert alert-success mb-5">✅ {successCount} kantong darah berhasil dicatat.</div>
                )}

                {/* Request context banner */}
                <div className="rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-center"
                  style={{ background: 'linear-gradient(135deg, #fff1f2, #fff5f5)', border: '1.5px solid #fecdd3' }}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Permintaan RS:</span>
                    <span className="font-display text-lg font-black text-white px-3 py-1 rounded-lg"
                      style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                      {request.blood_type}{request.rhesus}
                    </span>
                  </div>
                  <BloodProductsRequested req={request} />
                </div>

                <div className="space-y-6">

                  {/* ── SECTION A: Field Array ── */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">A</span>
                        Data Kantong Darah
                        <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{bags.length} kantong</span>
                      </p>
                      {productOptions.length > 0 && (
                        <span className="text-[10px] text-gray-400 font-medium">
                          Dropdown dibatasi dari permintaan RS
                        </span>
                      )}
                    </div>

                    {/* Bag rows */}
                    <div className="space-y-3">
                      {bags.map((row, idx) => (
                        <BagRowInput
                          key={row._id}
                          index={idx}
                          row={row}
                          productOptions={productOptions}
                          canRemove={bags.length > 1}
                          today={today}
                          onChange={updateBag}
                          onRemove={removeBag}
                        />
                      ))}
                    </div>

                    {/* Add bag button */}
                    <button
                      type="button"
                      id="add-bag-btn"
                      onClick={addBag}
                      className="mt-3 w-full py-2.5 rounded-xl border-2 border-dashed border-red-200 text-red-600 font-bold text-sm hover:border-red-400 hover:bg-red-50 transition-all flex items-center justify-center gap-2"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      + Tambah Kantong Darah
                    </button>
                  </div>

                  <hr className="border-gray-100" />

                  {/* ── SECTION B: Global Blood Type & Rhesus ── */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black">B</span>
                      Golongan Darah (berlaku untuk semua kantong)
                      <span className="text-[10px] font-normal text-blue-500">(dari permintaan RS)</span>
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Golongan Darah ABO</Label>
                        <div className="flex gap-2">
                          {BLOOD_TYPES.map(t => (
                            <button key={t} type="button" id={`resp-blood-type-${t}`}
                              onClick={() => updateOfficer('blood_type_abo', t)}
                              className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all ${
                                officer.blood_type_abo === t ? 'border-red-500 bg-red-600 text-white' : 'border-gray-200 text-gray-500 hover:border-red-200'
                              }`}>{t}</button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Label>Rhesus</Label>
                        <div className="flex gap-2">
                          {RHESUS_OPTIONS.map(r => (
                            <button key={r} type="button" id={`resp-rhesus-${r}`}
                              onClick={() => updateOfficer('rhesus', r)}
                              className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                                officer.rhesus === r ? 'border-red-500 bg-red-600 text-white' : 'border-gray-200 text-gray-500 hover:border-red-200'
                              }`}>{r}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* ── SECTION C: Global Officer Info ── */}
                  <div>
                    <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">C</span>
                      Petugas Pengeluaran (ATD/PTTD)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label>Nama Petugas</Label>
                        <input id="officer-name-input" type="text" className="input-field"
                          placeholder="Nama petugas ATD/PTTD"
                          value={officer.officer_name}
                          onChange={e => updateOfficer('officer_name', e.target.value)} />
                      </div>
                      <div>
                        <Label>Tanggal Pengeluaran</Label>
                        <input id="release-date-input" type="date" className="input-field"
                          value={officer.release_date}
                          onChange={e => updateOfficer('release_date', e.target.value)} />
                      </div>
                      <div>
                        <Label>Jam Pengeluaran</Label>
                        <input id="release-time-input" type="time" className="input-field"
                          value={officer.release_time}
                          onChange={e => updateOfficer('release_time', e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <hr className="border-gray-100" />

                  {/* ── Proceed to sign button ── */}
                  <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <p className="text-sm font-bold text-blue-800">
                        {bags.length} kantong siap dikonfirmasi
                      </p>
                      <p className="text-xs text-blue-600 mt-0.5">
                        Klik tombol ini untuk membuka panel tanda tangan Petugas PMI dan Pengambil Darah.
                      </p>
                    </div>
                    <button
                      type="button"
                      id="proceed-to-sign-btn"
                      onClick={() => {
                        const err = validateBags()
                        if (err) return setError(err)
                        setError(null)
                        setShowSignModal(true)
                      }}
                      className="flex-shrink-0 py-3 px-6 rounded-xl font-bold text-sm text-white transition-all flex items-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}
                    >
                      ✍️ Selesai &amp; Lanjut Tanda Tangan
                    </button>
                  </div>

                </div>
              </>
            )}
          </div>
        )}

        {/* ── Done states ── */}
        {currentStatus === 'completed' && (
          <div className="card p-6 text-center" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <p className="text-4xl mb-2">✅</p>
            <p className="font-display text-lg font-bold text-green-700">Permintaan Selesai</p>
            <p className="text-green-600 text-sm mt-1">{responses.length} kantong darah telah diberikan.</p>
          </div>
        )}
        {currentStatus === 'rejected' && rejectionSent && (
          <div className="card p-6 text-center" style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
            <p className="text-4xl mb-2">❌</p>
            <p className="font-display text-lg font-bold text-red-700">Status: Tidak Tersedia</p>
            <p className="text-red-600 text-sm mt-1 max-w-sm mx-auto">{rejectionNotes || 'Darah tidak tersedia.'}</p>
          </div>
        )}

      </div>
    </>
  )
}
