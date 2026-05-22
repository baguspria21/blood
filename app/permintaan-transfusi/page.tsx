'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Hospital {
  id: string
  name: string
  address: string
}

type BloodType = 'A' | 'B' | 'AB' | 'O'
type Rhesus = '+' | '-'

const BLOOD_TYPES: BloodType[] = ['A', 'B', 'AB', 'O']
const RHESUS_OPTIONS = [
  { value: '+' as Rhesus, label: 'Positif (+)' },
  { value: '-' as Rhesus, label: 'Negatif (−)' },
]
const KELAS_OPTIONS = ['I', 'II', 'III', 'VIP', 'VVIP']

// ─── Helper Components ────────────────────────────────────────────────────────
function BloodDropIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

function SectionHeader({ num, title, subtitle }: { num: number; title: string; subtitle?: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center text-white text-sm font-bold flex-shrink-0 mt-0.5"
        style={{ boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>
        {num}
      </div>
      <div>
        <h2 className="font-display font-bold text-gray-900 text-lg leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}

function FieldLabel({ children, required, htmlFor }: { children: React.ReactNode; required?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-semibold text-gray-700 mb-1.5">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  )
}

function Divider() {
  return <hr className="border-red-50 my-1" />
}

/** Small numeric input for volume (cc) or bag counts */
function VolumeInput({
  id, value, onChange, unit = 'cc', placeholder = '0',
}: {
  id: string; value: string; onChange: (v: string) => void; unit?: string; placeholder?: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        id={id}
        type="number"
        min={0}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-24 text-center font-semibold text-sm"
        style={{
          padding: '0.45rem 0.6rem',
          border: '1.5px solid #e5e7eb',
          borderRadius: '0.6rem',
          outline: 'none',
          transition: 'border-color 0.2s, box-shadow 0.2s',
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = '#ef4444'
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(220,38,38,0.12)'
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = '#e5e7eb'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
      <span className="text-xs text-gray-500 font-medium">{unit}</span>
    </div>
  )
}

/** Yes/No toggle pair */
function YesNoToggle({
  id, value, onChange,
}: {
  id: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        id={`${id}-yes`}
        onClick={() => onChange(true)}
        className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
          value
            ? 'border-red-500 bg-red-600 text-white shadow-sm'
            : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
        }`}
      >
        Ya
      </button>
      <button
        type="button"
        id={`${id}-no`}
        onClick={() => onChange(false)}
        className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all ${
          !value
            ? 'border-red-500 bg-red-600 text-white shadow-sm'
            : 'border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500'
        }`}
      >
        Tidak
      </button>
    </div>
  )
}

// ─── Main Form Component ──────────────────────────────────────────────────────
export default function PermintaanTransfusiPage() {
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [loadingHospitals, setLoadingHospitals] = useState(true)

  // ── Section 1: Identitas ────────────────────────────────────────────────
  const [requestingHospital, setRequestingHospital] = useState('')
  const [bagian, setBagian] = useState('')
  const [kelas, setKelas] = useState('')
  const [noReg, setNoReg] = useState('')
  const [requestingDoctor, setRequestingDoctor] = useState('')
  const [hospitalId, setHospitalId] = useState('')

  // ── Section 2: Data Pasien ──────────────────────────────────────────────
  const [patientName, setPatientName] = useState('')
  const [spouseName, setSpouseName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [ageYears, setAgeYears] = useState('')
  const [ageMonths, setAgeMonths] = useState('')
  const [address, setAddress] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0])
  const [neededDate, setNeededDate] = useState('')

  // ── Section 3: Klinis ───────────────────────────────────────────────────
  const [diagnosis, setDiagnosis] = useState('')
  const [transfusionReason, setTransfusionReason] = useState('')
  const [hemoglobin, setHemoglobin] = useState('')
  const [hasPreviousTransfusion, setHasPreviousTransfusion] = useState(false)
  const [hadReaction, setHadReaction] = useState(false)
  const [reactionDate, setReactionDate] = useState('')
  const [symptoms1, setSymptoms1] = useState('')
  const [symptoms2, setSymptoms2] = useState('')

  // ── Section 4: Coombs & Riwayat Wanita ────────────────────────────────
  const [coombsTest, setCoombsTest] = useState(false)
  const [coombsDate, setCoombsDate] = useState('')
  const [coombsResult, setCoombsResult] = useState('')
  const [pregnancyCount, setPregnancyCount] = useState('')
  const [abortionCount, setAbortionCount] = useState('')
  const [hemolyticDisease, setHemolyticDisease] = useState(false)

  // ── Section 5: Golongan Darah ──────────────────────────────────────────
  const [bloodType, setBloodType] = useState<BloodType>('A')
  const [rhesus, setRhesus] = useState<Rhesus>('+')

  // ── Section 5b: Produk Darah (Whole Blood) ─────────────────────────────
  const [wbFresh, setWbFresh] = useState('')
  const [wbNew, setWbNew] = useState('')
  const [wbRegular, setWbRegular] = useState('')

  // ── Section 5c: PRC / Red Cells Concentrate ───────────────────────────
  const [prcFresh, setPrcFresh] = useState('')
  const [prcRegular, setPrcRegular] = useState('')
  const [prcWashed, setPrcWashed] = useState('')

  // ── Section 5d: Plasma ─────────────────────────────────────────────────
  const [plasmaRegular, setPlasmaRegular] = useState('')
  const [plasmaFFP, setPlasmaFFP] = useState('')

  // ── Section 5e: Faktor Pembekuan ───────────────────────────────────────
  const [factorThrombocyte, setFactorThrombocyte] = useState('')
  const [factorCryo, setFactorCryo] = useState('')
  const [factorBuffy, setFactorBuffy] = useState('')
  const [factorOther, setFactorOther] = useState('')

  // ── Submit state ───────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successData, setSuccessData] = useState<{ id: string; patient_name: string } | null>(null)

  // ── Load hospitals ─────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/v1/hospitals')
      .then(r => r.json())
      .then(d => { setHospitals(d.hospitals ?? []); setLoadingHospitals(false) })
      .catch(() => setLoadingHospitals(false))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!patientName.trim()) return setError('Nama pasien wajib diisi.')
    if (!contactPhone.trim()) return setError('Nomor kontak wajib diisi.')
    if (!requestDate) return setError('Tanggal permintaan wajib diisi.')

    // Validate at least one blood product requested
    const anyProduct = [wbFresh, wbNew, wbRegular, prcFresh, prcRegular, prcWashed,
      plasmaRegular, plasmaFFP, factorThrombocyte, factorCryo, factorBuffy, factorOther]
      .some(v => v && parseInt(v) > 0 || (v && typeof v === 'string' && v.trim().length > 0))

    if (!anyProduct) {
      return setError('Pilih minimal satu jenis produk darah yang diminta.')
    }

    setSubmitting(true)
    try {
      const fd = new FormData()

      // Section 1
      if (requestingHospital) fd.append('requesting_hospital', requestingHospital)
      if (bagian) fd.append('bagian', bagian)
      if (kelas) fd.append('kelas', kelas)
      if (noReg) fd.append('no_reg', noReg)
      if (requestingDoctor) fd.append('requesting_doctor', requestingDoctor)
      if (hospitalId) fd.append('hospital_id', hospitalId)

      // Section 2
      fd.append('patient_name', patientName.trim())
      fd.append('contact_phone', contactPhone.trim())
      fd.append('request_date', requestDate)
      if (spouseName) fd.append('spouse_name', spouseName)
      if (birthDate) fd.append('birth_date', birthDate)
      if (ageYears) fd.append('age_years', ageYears)
      if (ageMonths) fd.append('age_months', ageMonths)
      if (address) fd.append('address', address)
      if (neededDate) fd.append('needed_date', neededDate)

      // Section 3
      if (diagnosis) fd.append('diagnosis', diagnosis)
      if (transfusionReason) fd.append('transfusion_reason', transfusionReason)
      if (hemoglobin) fd.append('hemoglobin', hemoglobin)
      fd.append('has_previous_transfusion', hasPreviousTransfusion ? 'true' : 'false')
      fd.append('had_reaction', hadReaction ? 'true' : 'false')
      if (reactionDate) fd.append('reaction_date', reactionDate)
      if (symptoms1) fd.append('symptoms_1', symptoms1)
      if (symptoms2) fd.append('symptoms_2', symptoms2)

      // Section 4
      fd.append('coombs_test', coombsTest ? 'true' : 'false')
      if (coombsDate) fd.append('coombs_date', coombsDate)
      if (coombsResult) fd.append('coombs_result', coombsResult)
      if (pregnancyCount) fd.append('pregnancy_count', pregnancyCount)
      if (abortionCount) fd.append('abortion_count', abortionCount)
      fd.append('hemolytic_disease', hemolyticDisease ? 'true' : 'false')

      // Section 5
      fd.append('blood_type', bloodType)
      fd.append('rhesus', rhesus)
      if (wbFresh) fd.append('wb_fresh_volume', wbFresh)
      if (wbNew) fd.append('wb_new_volume', wbNew)
      if (wbRegular) fd.append('wb_regular_volume', wbRegular)
      if (prcFresh) fd.append('prc_fresh_volume', prcFresh)
      if (prcRegular) fd.append('prc_regular_volume', prcRegular)
      if (prcWashed) fd.append('prc_washed_volume', prcWashed)
      if (plasmaRegular) fd.append('plasma_regular_volume', plasmaRegular)
      if (plasmaFFP) fd.append('plasma_ffp_volume', plasmaFFP)
      if (factorThrombocyte) fd.append('factor_thrombocyte_bags', factorThrombocyte)
      if (factorCryo) fd.append('factor_cryoprecipitate_bags', factorCryo)
      if (factorBuffy) fd.append('factor_buffycoat_bags', factorBuffy)
      if (factorOther) fd.append('factor_other', factorOther)

      const res = await fetch('/api/v1/transfusion-requests', { method: 'POST', body: fd })
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
        <div className="w-full max-w-lg">
          <div className="card p-8 text-center space-y-6">
            <div className="w-24 h-24 rounded-3xl gradient-brand flex items-center justify-center mx-auto pulse-blood"
              style={{ boxShadow: '0 12px 40px rgba(220,38,38,0.4)' }}>
              <svg width={44} height={44} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <div>
              <h1 className="font-display text-2xl font-bold text-gray-900">Surat Permintaan Terkirim!</h1>
              <p className="text-gray-500 text-sm mt-2 leading-relaxed">
                Surat Permintaan Darah Transfusi untuk <strong>{successData.patient_name}</strong> berhasil dikirim.
                Tim PMI / Bank Darah akan memverifikasi dan memprosesnya segera.
              </p>
            </div>

            <div className="bg-gray-50 rounded-2xl p-4 text-left space-y-1.5">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nomor Permintaan</p>
              <p id="transfusion-success-id" className="font-mono text-sm font-bold text-gray-900 break-all">{successData.id}</p>
              <p className="text-xs text-gray-400">Simpan nomor ini untuk memantau status permintaan Anda.</p>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href={`/tracking?id=${successData.id}`}
                id="track-transfusion-btn"
                className="btn-primary justify-center"
              >
                🔍 Pantau Status Permintaan
              </Link>
              <Link href="/" className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium">
                ← Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── FORM ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #ffffff 60%, #fff1f2 100%)' }}>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b border-red-100"
        style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(14px)' }}>
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
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
                PERMINTAAN TRANSFUSI
              </span>
            </div>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-red-600 transition-colors font-medium">
            ← Kembali
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 pb-16">

        {/* ── Page Title ── */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand mb-4 pulse-blood"
            style={{ boxShadow: '0 8px 28px rgba(220,38,38,0.38)' }}>
            <BloodDropIcon size={28} className="text-white" />
          </div>
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wide border border-red-200">
            Formulir Resmi
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 leading-tight">
            Permintaan Darah<br />
            <span className="text-gradient">Untuk Transfusi</span>
          </h1>
          <p className="text-gray-500 text-sm mt-3 max-w-md mx-auto leading-relaxed">
            Isi formulir berikut sesuai dengan surat permintaan transfusi darah resmi. Semua data akan diverifikasi oleh petugas Bank Darah / UTD RSUD.
          </p>
        </div>

        <form onSubmit={handleSubmit} id="transfusion-request-form" className="space-y-6">

          {/* ── Error Banner ── */}
          {error && (
            <div className="alert alert-error flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════
              SECTION 1 — IDENTITAS RS / PEMOHON
          ════════════════════════════════════════════════════════════ */}
          <div className="card p-6">
            <SectionHeader num={1} title="Identitas Pemohon" subtitle="Data Rumah Sakit dan dokter yang meminta" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <FieldLabel htmlFor="requesting-hospital-input">Rumah Sakit</FieldLabel>
                <input
                  id="requesting-hospital-input"
                  type="text"
                  className="input-field"
                  placeholder="Nama Rumah Sakit"
                  value={requestingHospital}
                  onChange={e => setRequestingHospital(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="hospital-select">Pilih RS (untuk sistem)</FieldLabel>
                {loadingHospitals ? (
                  <div className="input-field bg-gray-50 text-gray-400">Memuat daftar RS...</div>
                ) : (
                  <select
                    id="hospital-select"
                    className="input-field"
                    value={hospitalId}
                    onChange={e => {
                      setHospitalId(e.target.value)
                      const h = hospitals.find(h => h.id === e.target.value)
                      if (h && !requestingHospital) setRequestingHospital(h.name)
                    }}
                  >
                    <option value="">-- Pilih RS --</option>
                    {hospitals.map(h => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <FieldLabel htmlFor="bagian-input">Bagian / Ward</FieldLabel>
                <input
                  id="bagian-input"
                  type="text"
                  className="input-field"
                  placeholder="Contoh: Penyakit Dalam, Bedah..."
                  value={bagian}
                  onChange={e => setBagian(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="kelas-select">Kelas Perawatan</FieldLabel>
                <select
                  id="kelas-select"
                  className="input-field"
                  value={kelas}
                  onChange={e => setKelas(e.target.value)}
                >
                  <option value="">-- Pilih Kelas --</option>
                  {KELAS_OPTIONS.map(k => (
                    <option key={k} value={k}>Kelas {k}</option>
                  ))}
                </select>
              </div>

              <div>
                <FieldLabel htmlFor="no-reg-input">No. Registrasi</FieldLabel>
                <input
                  id="no-reg-input"
                  type="text"
                  className="input-field"
                  placeholder="Nomor registrasi pasien"
                  value={noReg}
                  onChange={e => setNoReg(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="requesting-doctor-input">Dokter yang Meminta</FieldLabel>
                <input
                  id="requesting-doctor-input"
                  type="text"
                  className="input-field"
                  placeholder="dr. Nama Dokter Sp.XX"
                  value={requestingDoctor}
                  onChange={e => setRequestingDoctor(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 2 — DATA PASIEN
          ════════════════════════════════════════════════════════════ */}
          <div className="card p-6">
            <SectionHeader num={2} title="Data Pasien" subtitle="Identitas pasien yang memerlukan transfusi" />

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="patient-name-input" required>Nama Lengkap Pasien (a.n.)</FieldLabel>
                  <input
                    id="patient-name-input"
                    type="text"
                    className="input-field"
                    placeholder="Nama lengkap pasien"
                    value={patientName}
                    onChange={e => setPatientName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <FieldLabel htmlFor="spouse-name-input">Nama Suami / Istri</FieldLabel>
                  <input
                    id="spouse-name-input"
                    type="text"
                    className="input-field"
                    placeholder="Nama suami/istri (jika ada)"
                    value={spouseName}
                    onChange={e => setSpouseName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <FieldLabel htmlFor="birth-date-input">Tanggal Lahir</FieldLabel>
                  <input
                    id="birth-date-input"
                    type="date"
                    className="input-field"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="age-years-input">Umur (Tahun)</FieldLabel>
                  <input
                    id="age-years-input"
                    type="number"
                    min={0}
                    max={150}
                    className="input-field"
                    placeholder="0"
                    value={ageYears}
                    onChange={e => setAgeYears(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="age-months-input">Umur (Bulan)</FieldLabel>
                  <input
                    id="age-months-input"
                    type="number"
                    min={0}
                    max={11}
                    className="input-field"
                    placeholder="0"
                    value={ageMonths}
                    onChange={e => setAgeMonths(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <FieldLabel htmlFor="address-input">Alamat / Rumah</FieldLabel>
                <input
                  id="address-input"
                  type="text"
                  className="input-field"
                  placeholder="Alamat lengkap pasien"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="contact-phone-input" required>Nomor Kontak / WhatsApp Penanggung Jawab</FieldLabel>
                <input
                  id="contact-phone-input"
                  type="tel"
                  className="input-field"
                  placeholder="Contoh: 08123456789"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-400 mt-1">Nomor ini digunakan untuk notifikasi status permintaan.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="request-date-input" required>Tanggal Permintaan</FieldLabel>
                  <input
                    id="request-date-input"
                    type="date"
                    className="input-field"
                    value={requestDate}
                    onChange={e => setRequestDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="needed-date-input">Tanggal Diperlukan</FieldLabel>
                  <input
                    id="needed-date-input"
                    type="date"
                    className="input-field"
                    value={neededDate}
                    onChange={e => setNeededDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 3 — DIAGNOSA & KLINIS
          ════════════════════════════════════════════════════════════ */}
          <div className="card p-6">
            <SectionHeader num={3} title="Diagnosa & Klinis" subtitle="Informasi medis pasien" />

            <div className="space-y-5">
              <div>
                <FieldLabel htmlFor="diagnosis-input">Diagnosa Klinis</FieldLabel>
                <input
                  id="diagnosis-input"
                  type="text"
                  className="input-field"
                  placeholder="Diagnosa pasien (e.g. Anemia, Hemorrhagic Shock...)"
                  value={diagnosis}
                  onChange={e => setDiagnosis(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="transfusion-reason-input">Alasan Transfusi</FieldLabel>
                <input
                  id="transfusion-reason-input"
                  type="text"
                  className="input-field"
                  placeholder="Alasan memerlukan transfusi darah"
                  value={transfusionReason}
                  onChange={e => setTransfusionReason(e.target.value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="hemoglobin-input">Hb (Hemoglobin) g/%</FieldLabel>
                <div className="flex items-center gap-2 max-w-[180px]">
                  <input
                    id="hemoglobin-input"
                    type="number"
                    step="0.1"
                    min={0}
                    max={30}
                    className="input-field text-center font-bold"
                    placeholder="0.0"
                    value={hemoglobin}
                    onChange={e => setHemoglobin(e.target.value)}
                  />
                  <span className="text-sm text-gray-500 font-medium whitespace-nowrap">g/%</span>
                </div>
              </div>

              <Divider />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <FieldLabel>Transfusi sebelumnya?</FieldLabel>
                  <YesNoToggle id="previous-transfusion" value={hasPreviousTransfusion} onChange={setHasPreviousTransfusion} />
                </div>
                <div>
                  <FieldLabel>Pernah reaksi transfusi?</FieldLabel>
                  <YesNoToggle id="had-reaction" value={hadReaction} onChange={setHadReaction} />
                  {hadReaction && (
                    <div className="mt-3">
                      <FieldLabel htmlFor="reaction-date-input">Kapan (tanggal reaksi)</FieldLabel>
                      <input
                        id="reaction-date-input"
                        type="date"
                        className="input-field"
                        value={reactionDate}
                        onChange={e => setReactionDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FieldLabel htmlFor="symptoms-1-input">Gejala 1</FieldLabel>
                  <input
                    id="symptoms-1-input"
                    type="text"
                    className="input-field"
                    placeholder="Gejala pertama..."
                    value={symptoms1}
                    onChange={e => setSymptoms1(e.target.value)}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="symptoms-2-input">Gejala 2</FieldLabel>
                  <input
                    id="symptoms-2-input"
                    type="text"
                    className="input-field"
                    placeholder="Gejala kedua..."
                    value={symptoms2}
                    onChange={e => setSymptoms2(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 4 — UJI COOMBS & RIWAYAT WANITA
          ════════════════════════════════════════════════════════════ */}
          <div className="card p-6">
            <SectionHeader num={4} title="Uji Coombs & Riwayat Wanita" subtitle="Pemeriksaan serologi & khusus pasien wanita" />

            <div className="space-y-5">
              <div>
                <FieldLabel>Apakah pernah pemeriksaan serologi golongan darah (Coombs test)?</FieldLabel>
                <YesNoToggle id="coombs-test" value={coombsTest} onChange={setCoombsTest} />

                {coombsTest && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-red-50/60 rounded-xl p-4 border border-red-100">
                    <div>
                      <FieldLabel htmlFor="coombs-date-input">Tanggal Pemeriksaan</FieldLabel>
                      <input
                        id="coombs-date-input"
                        type="date"
                        className="input-field"
                        value={coombsDate}
                        onChange={e => setCoombsDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="coombs-result-input">Hasil</FieldLabel>
                      <input
                        id="coombs-result-input"
                        type="text"
                        className="input-field"
                        placeholder="Hasil uji Coombs..."
                        value={coombsResult}
                        onChange={e => setCoombsResult(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Divider />

              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Khusus untuk pasien wanita</p>
                <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <FieldLabel htmlFor="pregnancy-count-input">Jumlah kehamilan sebelumnya</FieldLabel>
                      <input
                        id="pregnancy-count-input"
                        type="number"
                        min={0}
                        className="input-field"
                        placeholder="0"
                        value={pregnancyCount}
                        onChange={e => setPregnancyCount(e.target.value)}
                      />
                    </div>
                    <div>
                      <FieldLabel htmlFor="abortion-count-input">Jumlah abortus</FieldLabel>
                      <input
                        id="abortion-count-input"
                        type="number"
                        min={0}
                        className="input-field"
                        placeholder="0"
                        value={abortionCount}
                        onChange={e => setAbortionCount(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <FieldLabel>Adakah penyakit hemolitik pada bayi (HDN)?</FieldLabel>
                    <YesNoToggle id="hemolytic-disease" value={hemolyticDisease} onChange={setHemolyticDisease} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SECTION 5 — GOLONGAN DARAH & PRODUK YANG DIMINTA
          ════════════════════════════════════════════════════════════ */}
          <div className="card p-6">
            <SectionHeader num={5} title="Golongan Darah & Darah yang Diminta" subtitle="Pilih golongan darah dan jenis produk yang dibutuhkan" />

            {/* Blood Type & Rhesus */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <FieldLabel>Golongan Darah</FieldLabel>
                <div className="segment-group" id="blood-type-group">
                  {BLOOD_TYPES.map(t => (
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
                <FieldLabel>Rhesus</FieldLabel>
                <div className="segment-group" id="rhesus-group">
                  {RHESUS_OPTIONS.map(r => (
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
            </div>

            {/* Blood Products */}
            <div className="space-y-5">

              {/* Whole Blood */}
              <div className="rounded-2xl border-2 border-red-100 bg-red-50/40 overflow-hidden">
                <div className="px-5 py-3 gradient-brand flex items-center gap-2">
                  <BloodDropIcon size={14} className="text-white opacity-80" />
                  <span className="font-display font-bold text-white text-sm tracking-wide">DARAH LENGKAP (WHOLE BLOOD)</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Segar</p>
                      <p className="text-xs text-gray-400">&#60; 48 jam</p>
                    </div>
                    <VolumeInput id="wb-fresh-input" value={wbFresh} onChange={setWbFresh} />
                  </div>
                  <Divider />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Baru</p>
                      <p className="text-xs text-gray-400">&#60; 6 hari</p>
                    </div>
                    <VolumeInput id="wb-new-input" value={wbNew} onChange={setWbNew} />
                  </div>
                  <Divider />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Biasa</p>
                    </div>
                    <VolumeInput id="wb-regular-input" value={wbRegular} onChange={setWbRegular} />
                  </div>
                </div>
              </div>

              {/* PRC / Packed Cells */}
              <div className="rounded-2xl border-2 border-orange-100 bg-orange-50/30 overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}>
                  <span className="font-display font-bold text-white text-sm tracking-wide">RED CELLS CONCENTRATE (PACKED CELLS)</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Segar</p>
                      <p className="text-xs text-gray-400">PRC Segar</p>
                    </div>
                    <VolumeInput id="prc-fresh-input" value={prcFresh} onChange={setPrcFresh} />
                  </div>
                  <Divider />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Biasa</p>
                      <p className="text-xs text-gray-400">PRC Reguler</p>
                    </div>
                    <VolumeInput id="prc-regular-input" value={prcRegular} onChange={setPrcRegular} />
                  </div>
                  <Divider />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Cuci</p>
                      <p className="text-xs text-gray-400">Washed PRC</p>
                    </div>
                    <VolumeInput id="prc-washed-input" value={prcWashed} onChange={setPrcWashed} />
                  </div>
                </div>
              </div>

              {/* Plasma */}
              <div className="rounded-2xl border-2 border-yellow-100 bg-yellow-50/30 overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                  <span className="font-display font-bold text-white text-sm tracking-wide">PLASMA</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Plasma Biasa</p>
                    </div>
                    <VolumeInput id="plasma-regular-input" value={plasmaRegular} onChange={setPlasmaRegular} />
                  </div>
                  <Divider />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Fresh Frozen Plasma (FFP)</p>
                    </div>
                    <VolumeInput id="plasma-ffp-input" value={plasmaFFP} onChange={setPlasmaFFP} />
                  </div>
                </div>
              </div>

              {/* Faktor Pembekuan */}
              <div className="rounded-2xl border-2 border-purple-100 bg-purple-50/30 overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)' }}>
                  <span className="font-display font-bold text-white text-sm tracking-wide">FAKTOR PEMBEKUAN</span>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Thrombocyte Concentrate</p>
                    </div>
                    <VolumeInput id="factor-thrombocyte-input" value={factorThrombocyte} onChange={setFactorThrombocyte} unit="kantong" />
                  </div>
                  <Divider />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Cryoprecipitate – AHV</p>
                    </div>
                    <VolumeInput id="factor-cryo-input" value={factorCryo} onChange={setFactorCryo} unit="kantong" />
                  </div>
                  <Divider />
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">Buffy coat – granulocyte concentrate</p>
                    </div>
                    <VolumeInput id="factor-buffy-input" value={factorBuffy} onChange={setFactorBuffy} unit="kantong" />
                  </div>
                  <Divider />
                  <div>
                    <FieldLabel htmlFor="factor-other-input">Lain-lain</FieldLabel>
                    <input
                      id="factor-other-input"
                      type="text"
                      className="input-field"
                      placeholder="Produk lainnya (jika ada)..."
                      value={factorOther}
                      onChange={e => setFactorOther(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════
              SUMMARY + SUBMIT
          ════════════════════════════════════════════════════════════ */}
          <div className="card p-6 space-y-5" style={{ background: '#fef2f2', borderColor: '#fecdd3' }}>
            <h2 className="font-display font-bold text-gray-900 text-lg">Ringkasan Permintaan</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              {[
                { label: 'Pasien', value: patientName || '—' },
                {
                  label: 'Gol. Darah',
                  value: `${bloodType}${rhesus}`,
                  highlight: true,
                },
                {
                  label: 'Diagnosa',
                  value: diagnosis || '—',
                },
                {
                  label: 'RS Tujuan',
                  value: hospitals.find(h => h.id === hospitalId)?.name || requestingHospital || '—',
                },
              ].map(({ label, value, highlight }) => (
                <div key={label} className={`rounded-xl p-3 ${highlight ? 'gradient-brand' : 'bg-white'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wide mb-1 ${highlight ? 'text-red-200' : 'text-gray-400'}`}>{label}</p>
                  <p className={`font-bold leading-tight ${highlight ? 'text-white text-xl font-display' : 'text-gray-800 text-sm'}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Products summary */}
            {(wbFresh || wbNew || wbRegular || prcFresh || prcRegular || prcWashed || plasmaRegular || plasmaFFP || factorThrombocyte || factorCryo || factorBuffy || factorOther) && (
              <div className="bg-white rounded-xl p-3 text-xs space-y-1.5">
                <p className="font-bold text-gray-500 uppercase tracking-wide text-[10px]">Produk yang Diminta</p>
                <div className="flex flex-wrap gap-2">
                  {wbFresh && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">WB Segar {wbFresh} cc</span>}
                  {wbNew && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">WB Baru {wbNew} cc</span>}
                  {wbRegular && <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">WB Biasa {wbRegular} cc</span>}
                  {prcFresh && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">PRC Segar {prcFresh} cc</span>}
                  {prcRegular && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">PRC Biasa {prcRegular} cc</span>}
                  {prcWashed && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">PRC Cuci {prcWashed} cc</span>}
                  {plasmaRegular && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">Plasma {plasmaRegular} cc</span>}
                  {plasmaFFP && <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-semibold">FFP {plasmaFFP} cc</span>}
                  {factorThrombocyte && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Trombosit {factorThrombocyte} ktg</span>}
                  {factorCryo && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Cryo {factorCryo} ktg</span>}
                  {factorBuffy && <span className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-semibold">Buffy Coat {factorBuffy} ktg</span>}
                  {factorOther && <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-semibold">{factorOther}</span>}
                </div>
              </div>
            )}

            <button
              type="submit"
              id="submit-transfusion-btn"
              disabled={submitting || loadingHospitals}
              className="btn-primary"
            >
              {submitting ? (
                <><span className="spinner" /> Mengirim Surat Permintaan...</>
              ) : (
                <><BloodDropIcon size={18} /> Kirim Surat Permintaan Transfusi</>
              )}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Dengan mengirim formulir ini, Anda menyatakan bahwa semua data yang diberikan adalah benar dan dapat diverifikasi oleh petugas Bank Darah / UTD RSUD.
            </p>
          </div>

        </form>
      </main>
    </div>
  )
}
