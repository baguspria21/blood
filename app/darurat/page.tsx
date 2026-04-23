'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

interface Hospital {
  id: string
  name: string
  address: string
}

type BloodType = 'A' | 'B' | 'AB' | 'O'
type Rhesus = '+' | '-'

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O']
const RHESUS_OPTIONS: { value: Rhesus; label: string }[] = [
  { value: '+', label: 'Positif (+)' },
  { value: '-', label: 'Negatif (−)' },
]

const MAX_FILE_SIZE_MB = 5

function BloodDropIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

export default function DaruratPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loadingHospitals, setLoadingHospitals] = useState(true)

  // Form state
  const [patientName, setPatientName] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [hospitalId, setHospitalId] = useState('')
  const [bloodType, setBloodType] = useState<BloodType>('A')
  const [rhesus, setRhesus] = useState<Rhesus>('+')
  const [bagsNeeded, setBagsNeeded] = useState(1)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Submission state
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ id: string; patient_name: string } | null>(null)

  useEffect(() => {
    fetch('/api/v1/hospitals')
      .then((r) => r.json())
      .then((d) => { setHospitals(d.hospitals ?? []); setLoadingHospitals(false) })
      .catch(() => setLoadingHospitals(false))
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) { setProofFile(null); setPreviewUrl(null); return }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${MAX_FILE_SIZE_MB} MB.`)
      return
    }
    setError(null)
    setProofFile(file)
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file))
    } else {
      setPreviewUrl(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!patientName.trim()) return setError('Nama pasien wajib diisi.')
    if (!contactPhone.trim()) return setError('Nomor kontak wajib diisi.')
    if (!hospitalId) return setError('Pilih rumah sakit tujuan.')
    if (bagsNeeded < 1) return setError('Jumlah kantong minimal 1.')

    setSubmitting(true)

    try {
      const fd = new FormData()
      fd.append('patient_name', patientName.trim())
      fd.append('contact_phone', contactPhone.trim())
      fd.append('hospital_id', hospitalId)
      fd.append('blood_type', bloodType)
      fd.append('rhesus', rhesus)
      fd.append('bags_needed', String(bagsNeeded))
      if (proofFile) fd.append('proof_file', proofFile)

      const res = await fetch('/api/v1/requests', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error ?? 'Gagal mengirim permintaan.')

      setSuccessData({ id: json.request.id, patient_name: json.request.patient_name })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── SUCCESS SCREEN ────────────────────────────────────────────────────────
  if (successData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12"
        style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #ffffff 55%, #fff1f2 100%)' }}>
        <div className="w-full max-w-md">
          <div className="card p-8 text-center space-y-5">
            <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto pulse-blood"
              style={{ boxShadow: '0 10px 30px rgba(220,38,38,0.35)' }}>
              <span className="text-white text-4xl">✓</span>
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">Permintaan Terkirim!</h1>
              <p className="text-gray-500 text-sm mt-1">
                Permintaan darah untuk <strong>{successData.patient_name}</strong> berhasil dikirim.
                Admin PMI akan memverifikasi dalam waktu singkat.
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">ID Permintaan</p>
              <p id="request-success-id" className="font-mono text-sm font-bold text-gray-900 break-all">{successData.id}</p>
              <p className="text-xs text-gray-400">Simpan ID ini untuk memantau status permintaan Anda.</p>
            </div>
            <div className="flex flex-col gap-3">
              <Link
                href={`/tracking?id=${successData.id}`}
                id="track-request-btn"
                className="btn-primary justify-center"
              >
                🔍 Pantau Status Permintaan
              </Link>
              <Link
                href="/"
                className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium"
              >
                ← Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── FORM ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #ffffff 55%, #fff1f2 100%)' }}>
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-red-100"
        style={{ background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center flex-shrink-0"
              style={{ boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}>
              <BloodDropIcon size={14} className="text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-display font-bold text-gray-900 text-sm block">
                Blood<span className="text-gradient">Connect</span>
              </span>
              <span className="block text-[10px] text-gray-400 font-medium -mt-0.5 tracking-wide">
                PERMINTAAN DARAH
              </span>
            </div>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium">
            ← Kembali
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 pulse-blood"
            style={{ boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}>
            <BloodDropIcon size={28} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Formulir Permintaan Darah Darurat</h1>
          <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">
            Isi formulir berikut dengan lengkap. Permintaan akan diverifikasi oleh admin PMI sebelum diteruskan ke relawan.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" id="emergency-request-form">

          {/* Error */}
          {error && (
            <div className="alert alert-error flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Card: Patient Info */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display font-bold text-gray-900 text-lg flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold">1</span>
              Data Pasien
            </h2>

            <div>
              <FieldLabel required>Nama Lengkap Pasien</FieldLabel>
              <input
                id="patient-name-input"
                type="text"
                className="input-field"
                placeholder="Masukkan nama lengkap pasien"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                required
              />
            </div>

            <div>
              <FieldLabel required>Nomor WhatsApp / Kontak Penanggung Jawab</FieldLabel>
              <input
                id="contact-phone-input"
                type="tel"
                className="input-field"
                placeholder="Contoh: 08123456789"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
              />
              <p className="text-xs text-gray-400 mt-1">Nomor ini akan digunakan untuk menghubungi Anda terkait status permintaan.</p>
            </div>

            <div>
              <FieldLabel required>Rumah Sakit Tujuan</FieldLabel>
              {loadingHospitals ? (
                <div className="input-field bg-gray-50 text-gray-400">Memuat daftar RS...</div>
              ) : (
                <select
                  id="hospital-select"
                  className="input-field"
                  value={hospitalId}
                  onChange={(e) => setHospitalId(e.target.value)}
                  required
                >
                  <option value="">-- Pilih Rumah Sakit --</option>
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>{h.name} — {h.address}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Card: Blood Info */}
          <div className="card p-6 space-y-5">
            <h2 className="font-display font-bold text-gray-900 text-lg flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold">2</span>
              Kebutuhan Darah
            </h2>

            <div>
              <FieldLabel required>Golongan Darah</FieldLabel>
              <div className="segment-group" id="blood-type-group">
                {BLOOD_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    id={`blood-type-${t}`}
                    onClick={() => setBloodType(t)}
                    className={`segment-option ${bloodType === t ? 'active' : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel required>Rhesus</FieldLabel>
              <div className="segment-group" id="rhesus-group">
                {RHESUS_OPTIONS.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    id={`rhesus-${r.value === '+' ? 'pos' : 'neg'}`}
                    onClick={() => setRhesus(r.value)}
                    className={`segment-option ${rhesus === r.value ? 'active' : ''}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <FieldLabel required>Jumlah Kantong Darah yang Dibutuhkan</FieldLabel>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  id="bags-decrement"
                  onClick={() => setBagsNeeded((v) => Math.max(1, v - 1))}
                  className="w-10 h-10 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-lg hover:border-red-300 hover:text-red-600 transition-colors flex items-center justify-center"
                >
                  −
                </button>
                <input
                  id="bags-needed-input"
                  type="number"
                  min={1}
                  max={20}
                  className="input-field text-center font-bold text-lg w-24"
                  value={bagsNeeded}
                  onChange={(e) => setBagsNeeded(Math.max(1, parseInt(e.target.value) || 1))}
                  required
                />
                <button
                  type="button"
                  id="bags-increment"
                  onClick={() => setBagsNeeded((v) => Math.min(20, v + 1))}
                  className="w-10 h-10 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-lg hover:border-red-300 hover:text-red-600 transition-colors flex items-center justify-center"
                >
                  +
                </button>
                <span className="text-sm text-gray-500 font-medium">kantong</span>
              </div>
            </div>
          </div>

          {/* Card: Proof Upload */}
          <div className="card p-6 space-y-4">
            <h2 className="font-display font-bold text-gray-900 text-lg flex items-center gap-2">
              <span className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold">3</span>
              Surat Rujukan Rumah Sakit
            </h2>
            <p className="text-sm text-gray-500">
              Upload foto atau scan Surat Rujukan RS yang mencantumkan nama pasien, golongan darah, tanda tangan dokter, dan stempel RS.
            </p>

            <input
              ref={fileInputRef}
              id="proof-file-input"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={handleFileChange}
            />

            {proofFile ? (
              <div className="rounded-xl border-2 border-green-300 bg-green-50 overflow-hidden">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="Preview surat rujukan" className="w-full max-h-48 object-contain bg-white" />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="text-2xl">📄</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-800 text-sm truncate">{proofFile.name}</p>
                      <p className="text-xs text-gray-400">{(proofFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  id="change-proof-btn"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 text-sm text-green-700 font-semibold bg-green-50 hover:bg-green-100 border-t border-green-200 transition-colors"
                >
                  ✏️ Ganti File
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="upload-proof-btn"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-xl py-8 flex flex-col items-center gap-2 text-gray-400 hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all"
              >
                <span className="text-4xl">📎</span>
                <span className="font-semibold text-sm">Klik untuk upload Surat Rujukan</span>
                <span className="text-xs">JPG, PNG, PDF · Maks. {MAX_FILE_SIZE_MB} MB</span>
              </button>
            )}
          </div>

          {/* Summary + Submit */}
          <div className="card p-6 space-y-4" style={{ background: '#fef2f2', borderColor: '#fecdd3' }}>
            <h2 className="font-display font-bold text-gray-900">Ringkasan Permintaan</h2>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[
                { label: 'Pasien', value: patientName || '—' },
                { label: 'Golongan Darah', value: `${bloodType}${rhesus}`, highlight: true },
                { label: 'Jumlah Kantong', value: `${bagsNeeded} kantong` },
                { label: 'RS Tujuan', value: hospitals.find((h) => h.id === hospitalId)?.name || '—' },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`rounded-lg p-2.5 ${highlight ? 'gradient-brand' : 'bg-white'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wide mb-0.5 ${highlight ? 'text-red-200' : 'text-gray-400'}`}>{label}</p>
                  <p className={`font-bold ${highlight ? 'text-white text-lg font-display' : 'text-gray-800'}`}>{value}</p>
                </div>
              ))}
            </div>

            <button
              type="submit"
              id="submit-request-btn"
              disabled={submitting || loadingHospitals}
              className="btn-primary"
            >
              {submitting ? (
                <><span className="spinner" /> Mengirim Permintaan...</>
              ) : (
                <><BloodDropIcon size={18} /> Kirim Permintaan Darah</>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Dengan mengirim formulir ini, Anda menyetujui bahwa data yang diberikan adalah benar dan dapat diverifikasi.
            </p>
          </div>

        </form>
      </main>
    </div>
  )
}
