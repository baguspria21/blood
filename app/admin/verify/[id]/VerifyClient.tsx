'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { checkDuplicateRequest, approveAndBlastRequest } from '@/app/actions/verify-actions'

interface RequestData {
  id: string
  patient_name: string
  blood_type: string
  rhesus: string
  bags_needed: number
  proof_url: string | null
  created_at: string
  hospitals: { id: string; name: string } | null
}

export default function VerifyClient({ request }: { request: RequestData }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Checklist State
  const [checks, setChecks] = useState({
    nameMatch: false,
    stampValid: false,
    bloodMatch: false,
  })

  // Priority & Action State
  const [priority, setPriority] = useState<'cito' | 'regular'>('regular')
  const [adminNotes, setAdminNotes] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Donation Schedule State
  const today = new Date().toISOString().split('T')[0]
  const [donationDate, setDonationDate] = useState('')
  const [donationTime, setDonationTime] = useState('')

  // Derived guards
  const allChecked = checks.nameMatch && checks.stampValid && checks.bloodMatch
  const scheduleReady = donationDate !== '' && donationTime !== ''
  const canApprove = allChecked && scheduleReady

  // Duplicates State
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)
  const [isCheckingDups, setIsCheckingDups] = useState(true)

  useEffect(() => {
    async function check() {
      if (!request.hospitals?.id) { setIsCheckingDups(false); return }
      try {
        const res = await checkDuplicateRequest(
          request.id,
          request.hospitals.id,
          request.blood_type,
          request.rhesus
        )
        if (res.hasDuplicate) {
          setDuplicateWarning(`Peringatan: Ditemukan ${res.duplicates?.length} permintaan serupa untuk tipe ${request.blood_type}${request.rhesus} di RS ini dalam 24 jam terakhir. Verifikasi dengan ekstra hati-hati untuk mencegah blast ganda.`)
        }
      } catch (e) {
        console.error(e)
      } finally {
        setIsCheckingDups(false)
      }
    }
    check()
  }, [request])

  const submitVerification = async () => {
    if (!canApprove) return

    startTransition(async () => {
      setError(null)
      const res = await approveAndBlastRequest(
        request.id,
        priority,
        adminNotes,
        { date: donationDate, time: donationTime }
      )
      if (!res.success) {
        setError(res.error || 'Server error occurred.')
      } else {
        router.push('/admin/permintaan?status=approved')
      }
    })
  }

  // Generate the WhatsApp Preview Message
  const waIcon = priority === 'cito' ? '🔴 [URGENT/CITO]' : '🟡 [REGULAR]'
  const scheduleStr = donationDate && donationTime
    ? `\n📅 Jadwal Donor: *${new Date(donationDate).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} pukul ${donationTime} WITA*`
    : '\n📅 Jadwal: *Menunggu penetapan admin*'
  const waMessagePreview = `*${waIcon} Panggilan Darurat Donor Darah!*
  
Halo Pahlawan Darah, pasien bernama *${request.patient_name}* sangat membutuhkan darah *${request.blood_type}${request.rhesus}* sebanyak *${request.bags_needed} Kantong* saat ini.
🏥 Lokasi: *${request.hospitals?.name ?? 'Tidak Diketahui'}*${scheduleStr}
  
Mohon bantuan Anda untuk segera respon di aplikasi BloodConnect Palu.`

  return (
    <div className="space-y-6">
      {/* Header Validation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/permintaan" className="text-gray-500 hover:text-red-600 font-bold transition-colors">
            ← Kembali
          </Link>
          <div className="h-6 w-px bg-gray-300"></div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 leading-tight">Command Center Verifikasi</h1>
            <p className="text-gray-500 text-xs">Pemeriksaan detail dokumen dan mitigasi spam</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {/* Warning Banner (Feature 2) */}
      {!isCheckingDups && duplicateWarning && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-300" style={{ background: '#fefce8' }}>
          <span className="text-2xl pt-1">⚠️</span>
          <div>
            <h3 className="font-bold text-yellow-900">Potensi Duplikasi Data Mendadak</h3>
            <p className="text-sm text-yellow-800">{duplicateWarning}</p>
          </div>
        </div>
      )}

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* LEFT COLUMN: Document Viewer */}
        <div className="card flex flex-col h-[750px]">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
            <h2 className="font-display font-bold text-gray-900">Surat Rujukan RS</h2>
            <span className="text-xs text-gray-500 font-medium">Pan/Zoom Disabled</span>
          </div>
          <div className="flex-1 bg-gray-900 overflow-hidden relative group">
            {request.proof_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img 
                src={request.proof_url} 
                alt="Medical Proof" 
                className="w-full h-full object-contain cursor-crosshair transform transition-transform duration-300 group-hover:scale-105"
              />
            ) : (
              <div className="flex items-center justify-center h-full flex-col text-gray-500">
                <span className="text-4xl mb-3">📄🚫</span>
                <p>Tidak ada lampiran dokumen</p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Command Center Interactive Layout */}
        <div className="space-y-6">
          
          {/* Section A: Checklist Validation */}
          <div className="card overflow-hidden border-2" style={{ borderColor: allChecked ? '#86efac' : '#fecaca' }}>
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-display font-bold text-gray-900 flex items-center justify-between">
                <span>1. Validasi Manual</span>
                <span className="text-xs px-2 py-1 bg-white border rounded-lg text-gray-500 shadow-sm font-mono">
                  {Object.values(checks).filter(Boolean).length}/3 Selesai
                </span>
              </h2>
            </div>
            <div className="p-5 space-y-4">
              <label className="flex items-start gap-4 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 mt-0.5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                  checked={checks.nameMatch}
                  onChange={(e) => setChecks(p => ({ ...p, nameMatch: e.target.checked }))}
                />
                <div>
                  <p className="font-bold text-sm text-gray-900">Nama Pasien Sesuai</p>
                  <p className="text-xs text-gray-500">Verifikasi <strong className="text-red-600">{request.patient_name}</strong> tertulis di surat rujukan.</p>
                </div>
              </label>

              <label className="flex items-start gap-4 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 mt-0.5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                  checked={checks.bloodMatch}
                  onChange={(e) => setChecks(p => ({ ...p, bloodMatch: e.target.checked }))}
                />
                <div>
                  <p className="font-bold text-sm text-gray-900">Golongan Darah Sesuai</p>
                  <p className="text-xs text-gray-500">Pasien membutuhkan <strong className="text-red-600">{request.blood_type}{request.rhesus}</strong> sebanyak <strong className="text-red-600">{request.bags_needed} kantong</strong>.</p>
                </div>
              </label>

              <label className="flex items-start gap-4 cursor-pointer p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <input 
                  type="checkbox" 
                  className="w-5 h-5 mt-0.5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                  checked={checks.stampValid}
                  onChange={(e) => setChecks(p => ({ ...p, stampValid: e.target.checked }))}
                />
                <div>
                  <p className="font-bold text-sm text-gray-900">Stempel & TTD Dokter Valid</p>
                  <p className="text-xs text-gray-500">Dokumen dilegalisir resmi oleh pihak <strong>{request.hospitals?.name}</strong>.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Section B: Triage Priority & Notes */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-display font-bold text-gray-900">2. Triase & Catatan Operasional</h2>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">Pilih Prioritas Blast:</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPriority('cito')}
                    className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                      priority === 'cito' ? 'border-red-500 bg-red-50 shadow-md ring-2 ring-red-200' : 'border-gray-200 hover:border-red-300'
                    }`}
                  >
                    <span className="text-lg">🔴</span>
                    <span className="font-bold text-gray-900">CITO (Kritis)</span>
                    <span className="text-xs text-gray-500">Blast seketika ke seluruh relawan cocok secara agresif.</span>
                  </button>
                  <button 
                    onClick={() => setPriority('regular')}
                    className={`flex flex-col gap-1 p-3 rounded-xl border-2 text-left transition-all ${
                      priority === 'regular' ? 'border-amber-500 bg-amber-50 shadow-md ring-2 ring-amber-200' : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <span className="text-lg">🟡</span>
                    <span className="font-bold text-gray-900">REGULAR</span>
                    <span className="text-xs text-gray-500">Terjadwal, notifikasi batch bertahap ke relawan.</span>
                  </button>
                </div>
              </div>

              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Catatan Internal (Opsional):</p>
                <textarea 
                  className="w-full input-field text-sm"
                  rows={2}
                  placeholder="Instruksi spesifik atau keterangan tambahan..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 2.5: Donation Schedule */}
          <div className="card overflow-hidden border-2" style={{ borderColor: scheduleReady ? '#86efac' : '#e5e7eb' }}>
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-display font-bold text-gray-900 flex items-center justify-between">
                <span>2.5. Jadwal Donor</span>
                {scheduleReady
                  ? <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-lg font-mono">✅ Siap</span>
                  : <span className="text-xs px-2 py-1 bg-red-50 text-red-500 rounded-lg font-mono">Wajib Diisi</span>
                }
              </h2>
              <p className="text-xs text-gray-400 mt-1">Tetapkan tanggal & jam donasi yang akan disertakan dalam pesan WhatsApp.</p>
            </div>
            <div className="p-5 grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="donation-date-input" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Tanggal Donor <span className="text-red-500">*</span>
                </label>
                <input
                  id="donation-date-input"
                  type="date"
                  min={today}
                  value={donationDate}
                  onChange={(e) => setDonationDate(e.target.value)}
                  className="w-full px-3 py-2.5 border-1.5 border-gray-200 rounded-xl text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition"
                />
              </div>
              <div>
                <label htmlFor="donation-time-input" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Jam Donor <span className="text-red-500">*</span>
                </label>
                <input
                  id="donation-time-input"
                  type="time"
                  value={donationTime}
                  onChange={(e) => setDonationTime(e.target.value)}
                  className="w-full px-3 py-2.5 border-1.5 border-gray-200 rounded-xl text-sm focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition"
                />
              </div>
              {scheduleReady && (
                <div className="col-span-2 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-50 border border-green-200">
                  <span className="text-green-600">📅</span>
                  <p className="text-sm font-semibold text-green-800">
                    {new Date(donationDate).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })} · {donationTime} WITA
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Section C: Action Layout & WhatsApp Preview */}
          <div className="card">
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-display font-bold text-gray-900">3. Eksekusi & Preview</h2>
            </div>
            <div className="p-5">
              
              <div className="mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">WhatsApp Blast Preview Layout</p>
                {/* Mock WhatsApp Bubble */}
                <div className="max-w-[85%] bg-[#dcf8c6] p-3 rounded-2xl rounded-tr-none shadow-sm text-sm text-gray-800 whitespace-pre-wrap ml-auto border border-green-200 relative">
                  <div className="absolute right-0 top-0 translate-x-[4px] -translate-y-[2px]">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="#dcf8c6"><path d="M0 20h20V0L0 20z"/></svg>
                  </div>
                  {waMessagePreview}
                  <p className="text-right text-[10px] text-gray-500 mt-2">12:00 PM ✓✓</p>
                </div>
              </div>

              <button
                onClick={submitVerification}
                disabled={!canApprove || isPending}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all shadow-lg flex justify-center items-center gap-3 ${
                  !canApprove
                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                    : priority === 'cito'
                      ? 'bg-red-600 hover:bg-red-700 hover:scale-[1.02]'
                      : 'bg-amber-600 hover:bg-amber-700 hover:scale-[1.02]'
                }`}
              >
                {isPending ? (
                  <span className="spinner border-t-white" />
                ) : (
                  <>🚀 Approve & Blast Message {priority === 'cito' ? '(CITO)' : '(REGULAR)'}</>
                )}
              </button>

              {!canApprove && (
                <p className="text-center text-xs text-red-500 mt-3 font-medium">
                  {!allChecked
                    ? 'Selesaikan semua centang validasi [ Bagian 1 ] untuk mengaktifkan tombol ini.'
                    : 'Tetapkan jadwal donor [ Bagian 2.5 ] untuk mengaktifkan tombol ini.'}
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
