'use client'

import { useState, useRef } from 'react'
import { SignaturePad, type SignaturePadHandle } from '../_components/SignaturePad'

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

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
  estimated_pickup_time?: string | null
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

// ── Bag row inside a product section ─────────────────────────────────────────
interface BagRow {
  _id: string
  bag_number: string
  volume_cc: string
  collection_date: string
}

// ── Per-product section ───────────────────────────────────────────────────────
type ProductStatus = 'tersedia' | 'tidak_tersedia'

interface ProductSection {
  key: string
  label: string           // blood_category value sent to DB
  requestedQty: string    // e.g. "250 cc" or "2 ktg" — display only
  status: ProductStatus
  bags: BagRow[]
  unavailableNotes: string
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).slice(2, 10)
}

function makeBagRow(today: string): BagRow {
  return { _id: uid(), bag_number: '', volume_cc: '', collection_date: today }
}

function buildProductSections(req: TransfusionRequest, today: string): ProductSection[] {
  const sections: ProductSection[] = []

  const add = (key: string, label: string, qty: string) =>
    sections.push({ key, label, requestedQty: qty, status: 'tersedia', bags: [makeBagRow(today)], unavailableNotes: '' })

  if (req.wb_fresh_volume)              add('wb_fresh',    'WB Segar',                `${req.wb_fresh_volume} cc`)
  if (req.wb_new_volume)                add('wb_new',      'WB Baru',                 `${req.wb_new_volume} cc`)
  if (req.wb_regular_volume)            add('wb_regular',  'WB Biasa',                `${req.wb_regular_volume} cc`)
  if (req.prc_fresh_volume)             add('prc_fresh',   'PRC Segar',               `${req.prc_fresh_volume} cc`)
  if (req.prc_regular_volume)           add('prc_regular', 'PRC Biasa',               `${req.prc_regular_volume} cc`)
  if (req.prc_washed_volume)            add('prc_washed',  'PRC Cuci',                `${req.prc_washed_volume} cc`)
  if (req.plasma_regular_volume)        add('plasma_reg',  'Plasma Biasa',            `${req.plasma_regular_volume} cc`)
  if (req.plasma_ffp_volume)            add('plasma_ffp',  'FFP',                     `${req.plasma_ffp_volume} cc`)
  if (req.factor_thrombocyte_bags)      add('thrombocyte', 'Thrombocyte Concentrate', `${req.factor_thrombocyte_bags} ktg`)
  if (req.factor_cryoprecipitate_bags)  add('cryo',        'Cryoprecipitate – AHV',   `${req.factor_cryoprecipitate_bags} ktg`)
  if (req.factor_buffycoat_bags)        add('buffy',        'Buffy Coat',             `${req.factor_buffycoat_bags} ktg`)
  if (req.factor_other)                 add('other',        req.factor_other,          'lain-lain')

  return sections
}

function fmtPickupTime(dt: string | null | undefined): string {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('id-ID', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
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

// ── Status toggle per product ─────────────────────────────────────────────────
function StatusToggle({
  id, value, onChange,
}: {
  id: string
  value: ProductStatus
  onChange: (v: ProductStatus) => void
}) {
  return (
    <div
      className="inline-flex rounded-xl overflow-hidden border text-xs font-bold"
      style={{ borderColor: value === 'tersedia' ? '#22c55e' : '#ef4444' }}
    >
      <button
        type="button"
        id={`${id}-tersedia`}
        onClick={() => onChange('tersedia')}
        className="py-1.5 px-3 transition-all"
        style={{
          background: value === 'tersedia' ? 'linear-gradient(135deg, #16a34a, #15803d)' : '#f9fafb',
          color: value === 'tersedia' ? '#fff' : '#9ca3af',
        }}
      >
        ✅ Tersedia
      </button>
      <button
        type="button"
        id={`${id}-tidak`}
        onClick={() => onChange('tidak_tersedia')}
        className="py-1.5 px-3 border-l transition-all"
        style={{
          borderLeftColor: value === 'tersedia' ? '#22c55e' : '#ef4444',
          background: value === 'tidak_tersedia' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#f9fafb',
          color: value === 'tidak_tersedia' ? '#fff' : '#9ca3af',
        }}
      >
        ❌ Tidak Tersedia
      </button>
    </div>
  )
}

// ── Single bag row input ──────────────────────────────────────────────────────
function BagRowInput({
  sectionKey, index, row, canRemove, today, onChange, onRemove,
}: {
  sectionKey: string
  index: number
  row: BagRow
  canRemove: boolean
  today: string
  onChange: (field: keyof BagRow, value: string) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-3 rounded-xl bg-white border border-gray-100">
      <div className="flex items-center self-end pb-1.5">
        <span
          className="w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-black flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
        >
          {index + 1}
        </span>
      </div>

      {/* Bag number */}
      <div className="min-w-[160px] flex-1">
        <Label required>No. Kantong</Label>
        <input
          id={`${sectionKey}-bag-${index}-number`}
          type="text"
          className="input-field font-mono font-bold text-sm"
          placeholder="UTD-2024-001"
          value={row.bag_number}
          onChange={e => onChange('bag_number', e.target.value)}
        />
      </div>

      {/* Volume */}
      <div className="min-w-[120px]">
        <Label>Volume (cc/ktg)</Label>
        <input
          id={`${sectionKey}-bag-${index}-volume`}
          type="text"
          className="input-field text-sm"
          placeholder="250 cc"
          value={row.volume_cc}
          onChange={e => onChange('volume_cc', e.target.value)}
        />
      </div>

      {/* Collection date */}
      <div className="min-w-[140px]">
        <Label>Tgl Ambil</Label>
        <input
          id={`${sectionKey}-bag-${index}-date`}
          type="date"
          className="input-field text-sm"
          value={row.collection_date}
          onChange={e => onChange('collection_date', e.target.value)}
        />
      </div>

      {/* Remove */}
      {canRemove && (
        <button
          type="button"
          id={`${sectionKey}-bag-${index}-remove`}
          onClick={onRemove}
          className="self-end mb-0.5 px-2 py-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          title="Hapus kantong ini"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
}

// ── Per-product section card ───────────────────────────────────────────────────
function ProductSectionCard({
  section, index, today, onChange,
}: {
  section: ProductSection
  index: number
  today: string
  onChange: (updater: (prev: ProductSection) => ProductSection) => void
}) {
  const addBag = () =>
    onChange(s => ({ ...s, bags: [...s.bags, makeBagRow(today)] }))

  const removeBag = (id: string) =>
    onChange(s => ({ ...s, bags: s.bags.length > 1 ? s.bags.filter(b => b._id !== id) : s.bags }))

  const updateBag = (id: string, field: keyof BagRow, value: string) =>
    onChange(s => ({ ...s, bags: s.bags.map(b => b._id === id ? { ...b, [field]: value } : b) }))

  const updateStatus = (v: ProductStatus) =>
    onChange(s => ({ ...s, status: v }))

  const updateNotes = (v: string) =>
    onChange(s => ({ ...s, unavailableNotes: v }))

  const isAvailable = section.status === 'tersedia'

  // Color palette based on product category for visual differentiation
  const colorMap: Record<string, { border: string; accent: string; bg: string }> = {
    wb_fresh:    { border: '#fca5a5', accent: '#dc2626', bg: '#fff5f5' },
    wb_new:      { border: '#fca5a5', accent: '#dc2626', bg: '#fff5f5' },
    wb_regular:  { border: '#fca5a5', accent: '#dc2626', bg: '#fff5f5' },
    prc_fresh:   { border: '#fdba74', accent: '#ea580c', bg: '#fff7ed' },
    prc_regular: { border: '#fdba74', accent: '#ea580c', bg: '#fff7ed' },
    prc_washed:  { border: '#fdba74', accent: '#ea580c', bg: '#fff7ed' },
    plasma_reg:  { border: '#fde68a', accent: '#ca8a04', bg: '#fefce8' },
    plasma_ffp:  { border: '#fde68a', accent: '#ca8a04', bg: '#fefce8' },
    thrombocyte: { border: '#c4b5fd', accent: '#7c3aed', bg: '#faf5ff' },
    cryo:        { border: '#c4b5fd', accent: '#7c3aed', bg: '#faf5ff' },
    buffy:       { border: '#c4b5fd', accent: '#7c3aed', bg: '#faf5ff' },
    other:       { border: '#d1d5db', accent: '#6b7280', bg: '#f9fafb' },
  }
  const palette = colorMap[section.key] ?? colorMap.other

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all"
      style={{
        border: `1.5px solid ${isAvailable ? palette.border : '#fecdd3'}`,
        background: isAvailable ? palette.bg : '#fff5f5',
        opacity: isAvailable ? 1 : 0.92,
      }}
    >
      {/* Section header */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5"
        style={{ borderBottom: `1px solid ${isAvailable ? palette.border : '#fecdd3'}` }}
      >
        <div className="flex items-center gap-3">
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black flex-shrink-0"
            style={{ background: isAvailable ? palette.accent : '#9ca3af' }}
          >
            {index + 1}
          </span>
          <div>
            <p className="font-bold text-gray-900 text-sm leading-tight">{section.label}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">
              Permintaan RS: <strong className="text-gray-600">{section.requestedQty}</strong>
            </p>
          </div>
        </div>

        <StatusToggle
          id={`product-status-${section.key}`}
          value={section.status}
          onChange={updateStatus}
        />
      </div>

      {/* Content area */}
      <div className="px-5 py-4">
        {/* ── TERSEDIA: bag input rows ── */}
        {isAvailable && (
          <div className="space-y-2">
            {section.bags.map((row, bagIdx) => (
              <BagRowInput
                key={row._id}
                sectionKey={section.key}
                index={bagIdx}
                row={row}
                canRemove={section.bags.length > 1}
                today={today}
                onChange={(field, value) => updateBag(row._id, field, value)}
                onRemove={() => removeBag(row._id)}
              />
            ))}

            <button
              type="button"
              id={`add-bag-${section.key}-btn`}
              onClick={addBag}
              className="w-full py-2 rounded-xl border border-dashed text-xs font-bold transition-all flex items-center justify-center gap-1.5"
              style={{ borderColor: palette.accent, color: palette.accent }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              + Tambah Kantong untuk {section.label}
            </button>
          </div>
        )}

        {/* ── TIDAK TERSEDIA: notes ── */}
        {!isAvailable && (
          <div className="flex items-center gap-3">
            <span className="text-xl flex-shrink-0">❌</span>
            <div className="flex-1">
              <Label>Keterangan (opsional)</Label>
              <input
                id={`unavailable-notes-${section.key}`}
                type="text"
                className="input-field text-sm"
                placeholder="Contoh: Stok habis, sedang dalam proses..."
                value={section.unavailableNotes}
                onChange={e => updateNotes(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Officer Signature Modal (DIPROSES stage) ──────────────────────────────────
// Only shows PMI Officer signature. Receiver is captured separately during handover.
interface OfficerSignatureModalProps {
  availableCount: number
  unavailableCount: number
  officerSigRef: React.RefObject<SignaturePadHandle | null>
  onConfirm: () => void
  onClose: () => void
  submitting: boolean
}

function OfficerSignatureModal({
  availableCount,
  unavailableCount,
  officerSigRef,
  onConfirm,
  onClose,
  submitting,
}: OfficerSignatureModalProps) {
  const isFullRejection = availableCount === 0
  const isPartial = unavailableCount > 0 && availableCount > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' }}
        >
          <div>
            <h3 className="font-display font-bold text-white text-lg">✍️ Tanda Tangan Petugas PMI</h3>
            <p className="text-blue-200 text-xs mt-0.5">
              {isFullRejection
                ? 'Konfirmasi: Semua produk tidak tersedia'
                : isPartial
                  ? `Konfirmasi sebagian — ${availableCount} tersedia, ${unavailableCount} tidak tersedia`
                  : `Konfirmasi ${availableCount} produk tersedia`}
            </p>
          </div>
          <button
            type="button"
            id="close-officer-sig-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Partial banner */}
          {isPartial && (
            <div className="rounded-xl p-3 text-xs font-medium"
              style={{ background: '#fffbeb', border: '1.5px solid #fde68a', color: '#92400e' }}>
              ⚠️ Pemenuhan <strong>sebagian</strong>: produk yang tidak tersedia akan dicatat. Pengambil Darah akan menandatangani saat pengambilan.
            </div>
          )}

          {/* PMI Officer Signature — the only signature at this stage */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)' }}>A</span>
              <p className="text-sm font-bold text-gray-800">
                Tanda Tangan Petugas PMI / ATD
                {isFullRejection && <span className="ml-2 text-xs font-normal text-gray-500">(verifikasi stok)</span>}
              </p>
            </div>
            <div className="rounded-xl border border-blue-100 bg-blue-50/30 p-3">
              <p className="text-[10px] text-gray-400 font-medium mb-2">✍️ Tanda tangan petugas ATD/PTTD yang bertugas:</p>
              <SignaturePad ref={officerSigRef} id="officer-sig-canvas" />
            </div>
          </div>

          {/* Info about receiver signature */}
          {!isFullRejection && (
            <div className="rounded-xl p-3 text-xs flex items-start gap-2"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
              <span className="text-base flex-shrink-0">ℹ️</span>
              <p>
                <strong>Tanda tangan Pengambil Darah</strong> akan diminta terpisah saat proses serah terima darah (status: Selesai).
              </p>
            </div>
          )}

          {/* Confirm */}
          <button
            type="button"
            id="confirm-officer-signature-btn"
            onClick={onConfirm}
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e40af)', boxShadow: '0 4px 14px rgba(29,78,216,0.35)' }}
          >
            {submitting
              ? <><span className="spinner" /> Menyimpan...</>
              : isFullRejection
                ? '💾 Konfirmasi: Semua Tidak Tersedia'
                : `💾 Konfirmasi & Simpan (DIPROSES)`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Handover Modal (SELESAI stage) ────────────────────────────────────────────
// Only shows Receiver signature. Officer has already signed.
interface HandoverModalProps {
  receiverSigRef: React.RefObject<SignaturePadHandle | null>
  receiverName: string
  onReceiverNameChange: (v: string) => void
  onConfirm: () => void
  onClose: () => void
  submitting: boolean
}

function HandoverModal({
  receiverSigRef,
  receiverName,
  onReceiverNameChange,
  onConfirm,
  onClose,
  submitting,
}: HandoverModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: '#fff', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, #15803d, #166534)' }}
        >
          <div>
            <h3 className="font-display font-bold text-white text-lg">🤝 Serah Terima Darah</h3>
            <p className="text-green-200 text-xs mt-0.5">
              Konfirmasi pengambilan darah — tanda tangan Pengambil Darah wajib
            </p>
          </div>
          <button
            type="button"
            id="close-handover-modal-btn"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors text-xl font-bold leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="rounded-xl p-3 text-xs flex items-start gap-2"
            style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534' }}>
            <span className="text-base flex-shrink-0">🩸</span>
            <p>Darah telah disiapkan oleh PMI. Minta pengambil darah untuk menandatangani sebelum membawa kantong darah.</p>
          </div>

          {/* Receiver name */}
          <div>
            <Label>Nama Pengambil Darah (Keluarga / Petugas RS) *</Label>
            <input
              id="handover-receiver-name-input"
              type="text"
              className="input-field"
              placeholder="Nama lengkap pengambil darah"
              value={receiverName}
              onChange={e => onReceiverNameChange(e.target.value)}
            />
          </div>

          {/* Receiver Signature — the only signature at this stage */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black text-white"
                style={{ background: 'linear-gradient(135deg, #15803d, #166534)' }}>✍</span>
              <p className="text-sm font-bold text-gray-800">Tanda Tangan Pengambil Darah</p>
            </div>
            <div className="rounded-xl border border-green-100 bg-green-50/30 p-3">
              <p className="text-[10px] text-gray-400 font-medium mb-2">✍️ Tanda tangan pengambil darah (keluarga pasien / petugas RS):</p>
              <SignaturePad ref={receiverSigRef} id="receiver-sig-canvas" />
            </div>
          </div>

          {/* Confirm */}
          <button
            type="button"
            id="confirm-handover-btn"
            onClick={onConfirm}
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #15803d, #166534)', boxShadow: '0 4px 14px rgba(21,128,61,0.35)' }}
          >
            {submitting
              ? <><span className="spinner" /> Memproses...</>
              : '✅ Konfirmasi Serah Terima — Tandai SELESAI'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export function ResponseForm({ request, existingResponses }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toTimeString().slice(0, 5)

  // ── Product sections (one per requested item) ────────────────────────────
  const [productSections, setProductSections] = useState<ProductSection[]>(() =>
    buildProductSections(request, today)
  )

  const updateSection = (key: string, updater: (prev: ProductSection) => ProductSection) =>
    setProductSections(prev => prev.map(s => s.key === key ? updater(s) : s))

  // ── Global officer / blood type ──────────────────────────────────────────
  const [officer, setOfficer] = useState({
    officer_name:  '',
    release_date:  today,
    release_time:  now,
    blood_type_abo: request.blood_type ?? '',
    rhesus:         request.rhesus === '+' ? 'Positif' : request.rhesus === '-' ? 'Negatif' : '',
    estimated_pickup_time: '',
  })
  const updateOfficer = (k: keyof typeof officer, v: string) =>
    setOfficer(prev => ({ ...prev, [k]: v }))

  // ── Handover / Receiver ──────────────────────────────────────────────────
  const [receiverName, setReceiverName] = useState('')
  const officerSigRef  = useRef<SignaturePadHandle>(null)
  const receiverSigRef = useRef<SignaturePadHandle>(null)

  // ── UI state ─────────────────────────────────────────────────────────────
  const [showOfficerModal, setShowOfficerModal]   = useState(false)
  const [showHandoverModal, setShowHandoverModal]  = useState(false)
  const [submitting, setSubmitting]                = useState(false)
  const [handoverSubmitting, setHandoverSubmitting] = useState(false)
  const [error, setError]                          = useState<string | null>(null)
  const [handoverError, setHandoverError]          = useState<string | null>(null)
  const [successCount, setSuccessCount]            = useState(0)
  const [diprosesSuccess, setDiprosesSuccess]      = useState(false) // hides form on success
  const [responses, setResponses]                  = useState<TransfusionResponse[]>(existingResponses)
  const [currentStatus, setCurrentStatus]          = useState(request.status)

  const BLOOD_TYPES    = ['A', 'B', 'AB', 'O']
  const RHESUS_OPTIONS = ['Positif', 'Negatif']
  const isFinished = currentStatus === 'completed' || currentStatus === 'rejected'
  const isDiproses = currentStatus === 'approved'

  // ── Derived counts ───────────────────────────────────────────────────────
  const availableCount   = productSections.filter(s => s.status === 'tersedia').length
  const unavailableCount = productSections.filter(s => s.status === 'tidak_tersedia').length

  // ── Validation ───────────────────────────────────────────────────────────
  const validate = (): string | null => {
    for (const section of productSections) {
      if (section.status !== 'tersedia') continue
      if (section.bags.length === 0) return `Tambahkan minimal 1 kantong untuk ${section.label}.`
      for (let i = 0; i < section.bags.length; i++) {
        if (!section.bags[i].bag_number.trim())
          return `No. kantong ${section.label} #${i + 1} wajib diisi.`
      }
    }
    return null
  }

  // ── Submit (DIPROSES) ─────────────────────────────────────────────────────
  const handleSubmitDiproses = async () => {
    setError(null)
    setSubmitting(true)
    try {
      const officerSignature = officerSigRef.current?.getDataURL() ?? null

      const res = await fetch('/api/v1/admin/transfusion-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfusion_request_id: request.id,
          blood_type_abo: officer.blood_type_abo || null,
          rhesus:         officer.rhesus         || null,
          officer_name:   officer.officer_name   || null,
          release_date:   officer.release_date   || null,
          release_time:   officer.release_time   || null,
          officer_signature:  officerSignature,
          estimated_pickup_time: officer.estimated_pickup_time || null,
          products: productSections.map(s => ({
            label:  s.label,
            status: s.status,
            bags:   s.status === 'tersedia'
              ? s.bags.map(b => ({ bag_number: b.bag_number.trim(), volume_cc: b.volume_cc || null, collection_date: b.collection_date || null }))
              : [],
            notes: s.status === 'tidak_tersedia' ? s.unavailableNotes : '',
          })),
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal menyimpan.')

      const newRows: TransfusionResponse[] = json.responses ?? []
      setResponses(prev => [...newRows, ...prev])
      setSuccessCount(c => c + newRows.length)
      setCurrentStatus(json.newStatus ?? 'approved')
      setShowOfficerModal(false)
      setDiprosesSuccess(true) // Hide the response form

      officerSigRef.current?.clear()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
      setShowOfficerModal(false)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Handover confirm (SELESAI) ────────────────────────────────────────────
  const handleHandoverConfirm = async () => {
    setHandoverError(null)
    setHandoverSubmitting(true)
    try {
      const receiverSignature = receiverSigRef.current?.getDataURL() ?? null

      const res = await fetch(`/api/v1/admin/handover/${request.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          receiver_name:      receiverName      || null,
          receiver_signature: receiverSignature || null,
        }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal mengkonfirmasi serah terima.')

      setCurrentStatus('completed')
      setShowHandoverModal(false)
      receiverSigRef.current?.clear()
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
      setShowHandoverModal(false)
    } finally {
      setHandoverSubmitting(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Officer Signature Modal (DIPROSES) */}
      {showOfficerModal && (
        <OfficerSignatureModal
          availableCount={availableCount}
          unavailableCount={unavailableCount}
          officerSigRef={officerSigRef}
          onConfirm={handleSubmitDiproses}
          onClose={() => setShowOfficerModal(false)}
          submitting={submitting}
        />
      )}

      {/* Handover / Receiver Signature Modal (SELESAI) */}
      {showHandoverModal && (
        <HandoverModal
          receiverSigRef={receiverSigRef}
          receiverName={receiverName}
          onReceiverNameChange={setReceiverName}
          onConfirm={handleHandoverConfirm}
          onClose={() => setShowHandoverModal(false)}
          submitting={handoverSubmitting}
        />
      )}

      <div className="space-y-6">

        {/* ════════════════════════════════════════════════════════════
            CARD 1: Request Summary
        ═════════════════════════════════════════════════════════════ */}
        <div className="card p-6">
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900">{request.patient_name}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{request.requesting_hospital ?? '—'}</p>
            </div>
            <div className="flex items-center gap-2">
              {request.blood_type && (
                <span className="font-display text-2xl font-black text-white px-4 py-2 rounded-xl"
                  style={{ background: 'linear-gradient(135deg,#dc2626,#b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,.4)' }}>
                  {request.blood_type}{request.rhesus}
                </span>
              )}
              <span className={`text-sm font-bold px-3 py-1.5 rounded-lg ${
                currentStatus === 'completed' ? 'bg-green-100 text-green-700' :
                currentStatus === 'approved'  ? 'bg-blue-100 text-blue-700'  :
                currentStatus === 'rejected'  ? 'bg-red-100 text-red-700'    : 'bg-amber-100 text-amber-700'
              }`}>
                {currentStatus === 'completed' ? '✓ Selesai' :
                 currentStatus === 'approved'  ? '● Diproses' :
                 currentStatus === 'rejected'  ? '✕ Ditolak'  : '○ Menunggu'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoRow label="Dokter"         value={request.requesting_doctor} />
            <InfoRow label="Bagian"         value={request.bagian} />
            <InfoRow label="Kelas"          value={request.kelas} />
            <InfoRow label="Kontak"         value={request.contact_phone} />
            <InfoRow label="Tgl Minta"      value={request.request_date   ? new Date(request.request_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'} />
            <InfoRow label="Tgl Diperlukan" value={request.needed_date    ? new Date(request.needed_date).toLocaleDateString('id-ID',  { dateStyle: 'medium' }) : '—'} />
            <InfoRow label="Diagnosa"       value={request.diagnosis} />
            <InfoRow label="Hb"             value={request.hemoglobin ? `${request.hemoglobin} g/%` : null} />
          </div>

          {/* Estimated pickup time display */}
          {request.estimated_pickup_time && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">⏰ Estimasi Waktu Pengambilan</p>
              <p className="text-sm font-semibold text-blue-800">{fmtPickupTime(request.estimated_pickup_time)}</p>
            </div>
          )}

          {/* Handover button — shown when status is DIPROSES and has responses */}
          {isDiproses && responses.length > 0 && (
            <div className="mt-5 pt-5 border-t border-gray-100">
              {handoverError && (
                <div className="alert alert-error mb-3 text-sm">⚠️ {handoverError}</div>
              )}
              <div className="flex items-center justify-between flex-wrap gap-3"
                style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '0.75rem', padding: '0.875rem 1.25rem' }}>
                <div>
                  <p className="text-sm font-bold text-green-900">🩸 Darah siap diserahterimakan</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    {responses.length} kantong tersedia. Minta pengambil darah untuk menandatangani serah terima.
                  </p>
                </div>
                <button
                  id="open-handover-modal-btn"
                  type="button"
                  onClick={() => setShowHandoverModal(true)}
                  className="flex-shrink-0 py-2.5 px-5 rounded-xl font-bold text-sm text-white transition-all flex items-center gap-2"
                  style={{ background: 'linear-gradient(135deg,#15803d,#166534)', boxShadow: '0 4px 14px rgba(21,128,61,.3)' }}
                >
                  🤝 Serahkan Darah &amp; Tandai Selesai
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════════════════════════════════════════════════
            CARD 2: Existing Responses Table
        ═════════════════════════════════════════════════════════════ */}
        {responses.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
              <h3 className="font-display font-bold text-gray-900">Data Kantong Darah yang Diberikan</h3>
              <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{responses.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['No. Kantong', 'Jenis', 'Volume', 'Gol.', 'Rh', 'Petugas', 'Penerima', 'Waktu Keluar'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {responses.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-gray-900 text-xs">{r.bag_number}</td>
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

        {/* ════════════════════════════════════════════════════════════
            CARD 3: DIPROSES Success State (shown after form submit)
        ═════════════════════════════════════════════════════════════ */}
        {diprosesSuccess && (
          <div className="card p-6 text-center" style={{ background: '#eff6ff', borderColor: '#bfdbfe' }}>
            <p className="text-4xl mb-3">🩸</p>
            <p className="font-display text-lg font-bold text-blue-800">Respons Berhasil Disimpan!</p>
            <p className="text-blue-600 text-sm mt-1">
              {successCount} kantong darah dicatat. Status permintaan sudah diperbarui ke <strong>DIPROSES</strong>.
            </p>
            <p className="text-xs text-blue-500 mt-2">
              Gunakan tombol &quot;Serahkan Darah&quot; di atas saat darah siap diambil oleh petugas RS.
            </p>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            CARD 3: Unified Response Form (hidden after DIPROSES success)
        ═════════════════════════════════════════════════════════════ */}
        {!isFinished && !diprosesSuccess && (
          <div className="card p-6 space-y-6">

            {/* Panel header + status pills */}
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h3 className="font-display font-bold text-gray-900 text-lg">Respons Permintaan Darah</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Isi status untuk setiap produk yang diminta. Pemenuhan sebagian diperbolehkan.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {availableCount > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                    ✅ {availableCount} tersedia
                  </span>
                )}
                {unavailableCount > 0 && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                    ❌ {unavailableCount} tidak tersedia
                  </span>
                )}
              </div>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            {/* ── Section A: Per-product list ── */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">A</span>
                Status per Produk yang Diminta
              </p>

              {productSections.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">
                  Tidak ada data produk yang diminta dalam permintaan ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {productSections.map((section, idx) => (
                    <ProductSectionCard
                      key={section.key}
                      section={section}
                      index={idx}
                      today={today}
                      onChange={updater => updateSection(section.key, updater)}
                    />
                  ))}
                </div>
              )}
            </div>

            <hr className="border-gray-100" />

            {/* ── Section B: Global blood type ── */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black">B</span>
                Golongan Darah
                <span className="text-[10px] font-normal text-blue-500">(berlaku untuk semua kantong)</span>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Golongan Darah ABO</Label>
                  <div className="flex gap-2">
                    {BLOOD_TYPES.map(t => (
                      <button key={t} type="button" id={`resp-bt-${t}`}
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
                      <button key={r} type="button" id={`resp-rh-${r}`}
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

            {/* ── Section C: Officer info ── */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
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

            {/* ── Section D: Estimated Pickup Time ── */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-black">D</span>
                Estimasi Waktu Pengambilan Darah
                <span className="text-[10px] font-normal text-gray-400">(akan ditampilkan ke RS)</span>
              </p>
              <div className="max-w-sm">
                <Label>Kapan darah bisa diambil?</Label>
                <input
                  id="estimated-pickup-time-input"
                  type="datetime-local"
                  className="input-field"
                  value={officer.estimated_pickup_time}
                  onChange={e => updateOfficer('estimated_pickup_time', e.target.value)}
                />
                <p className="text-xs text-gray-400 mt-1">
                  Opsional. Informasikan RS kapan darah siap dijemput.
                </p>
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* ── Proceed button ── */}
            <div
              className="rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap"
              style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe' }}
            >
              <div>
                <p className="text-sm font-bold text-blue-900">
                  {availableCount === productSections.length && productSections.length > 0
                    ? 'Semua produk tersedia — siap dikonfirmasi'
                    : unavailableCount === productSections.length && productSections.length > 0
                      ? 'Semua produk tidak tersedia — konfirmasi penolakan'
                      : `${availableCount} produk tersedia, ${unavailableCount} tidak tersedia`}
                </p>
                <p className="text-xs text-blue-600 mt-0.5">
                  Klik untuk membuka panel tanda tangan Petugas PMI (tanda tangan Pengambil Darah dilakukan saat serah terima).
                </p>
              </div>
              <button
                type="button"
                id="proceed-to-sign-btn"
                onClick={() => {
                  const err = validate()
                  if (err) return setError(err)
                  setError(null)
                  setShowOfficerModal(true)
                }}
                className="flex-shrink-0 py-3 px-6 rounded-xl font-bold text-sm text-white transition-all flex items-center gap-2"
                style={{ background: 'linear-gradient(135deg,#1d4ed8,#1e40af)', boxShadow: '0 4px 14px rgba(29,78,216,.3)' }}
              >
                ✍️ Selesai &amp; Tanda Tangan Petugas PMI
              </button>
            </div>

          </div>
        )}

        {/* ── Done states ── */}
        {currentStatus === 'completed' && (
          <div className="card p-6 text-center" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <p className="text-4xl mb-2">✅</p>
            <p className="font-display text-lg font-bold text-green-700">Permintaan Selesai</p>
            <p className="text-green-600 text-sm mt-1">{responses.length} kantong darah telah diserahterimakan.</p>
          </div>
        )}
        {currentStatus === 'rejected' && (
          <div className="card p-6 text-center" style={{ background: '#fff1f2', borderColor: '#fecdd3' }}>
            <p className="text-4xl mb-2">❌</p>
            <p className="font-display text-lg font-bold text-red-700">Status: Tidak Tersedia</p>
            {request.rejection_notes && (
              <p className="text-red-600 text-sm mt-1 max-w-md mx-auto">{request.rejection_notes}</p>
            )}
          </div>
        )}

      </div>
    </>
  )
}
