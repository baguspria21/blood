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

// ── Main Component ─────────────────────────────────────────────────────────────
export function ResponseForm({ request, existingResponses }: Props) {
  const today = new Date().toISOString().split('T')[0]
  const now = new Date().toTimeString().slice(0, 5)

  // ── Availability mode ──────────────────────────────────────────────────────
  const [isAvailable, setIsAvailable] = useState(request.status !== 'rejected')
  const [rejectionNotes, setRejectionNotes] = useState(request.rejection_notes ?? '')
  const [sendingRejection, setSendingRejection] = useState(false)
  const [rejectionSent, setRejectionSent] = useState(request.status === 'rejected')

  // ── Blood bag form ─────────────────────────────────────────────────────────
  const [form, setForm] = useState({
    bag_number: '',
    collection_date: today,
    blood_category: '',
    volume_cc: '',
    blood_type_abo: request.blood_type ?? '',
    rhesus: request.rhesus === '+' ? 'Positif' : request.rhesus === '-' ? 'Negatif' : '',
    officer_name: '',
    release_date: today,
    release_time: now,
    receiver_name: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successCount, setSuccessCount] = useState(0)
  const [responses, setResponses] = useState<TransfusionResponse[]>(existingResponses)
  const [markingDone, setMarkingDone] = useState(false)
  const [currentStatus, setCurrentStatus] = useState(request.status)

  // ── Imperative signature ref ───────────────────────────────────────────────
  const sigRef = useRef<SignaturePadHandle>(null)

  const update = (key: keyof typeof form, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  // ── Submit blood bag ───────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.bag_number.trim()) return setError('Nomor kantong wajib diisi.')
    setError(null)
    setSubmitting(true)

    // Grab signature from canvas ref at submit time
    const receiverSignature = sigRef.current?.getDataURL() ?? null

    try {
      const res = await fetch('/api/v1/admin/transfusion-responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfusion_request_id: request.id,
          ...form,
          receiver_signature: receiverSignature,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Gagal menyimpan.')

      setResponses(prev => [json.response, ...prev])
      setSuccessCount(c => c + 1)
      setCurrentStatus('approved')

      // Reset form fields and clear canvas
      setForm(prev => ({ ...prev, bag_number: '', collection_date: today, volume_cc: '', receiver_name: '' }))
      sigRef.current?.clear()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setSubmitting(false)
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

  // ── Send rejection ─────────────────────────────────────────────────────────
  const handleSendRejection = async (e: React.FormEvent) => {
    e.preventDefault()
    setSendingRejection(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/transfusion-responses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transfusion_request_id: request.id,
          status: 'rejected',
          rejection_notes: rejectionNotes.trim() || 'Darah tidak tersedia.',
        }),
      })
      if (!res.ok) throw new Error('Gagal mengirim status.')
      setCurrentStatus('rejected')
      setRejectionSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setSendingRejection(false)
    }
  }

  const BLOOD_TYPES = ['A', 'B', 'AB', 'O']
  const RHESUS_OPTIONS = ['Positif', 'Negatif']
  const BLOOD_CATEGORIES = ['PRC', 'Whole Blood', 'FFP', 'Thrombocyte Concentrate', 'Cryoprecipitate', 'Buffy Coat', 'Plasma Biasa']
  const isFinished = currentStatus === 'completed' || (currentStatus === 'rejected' && rejectionSent)

  return (
    <div className="space-y-6">
      {/* ── Request Summary ── */}
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
          <InfoRow label="Dokter" value={request.requesting_doctor} />
          <InfoRow label="Bagian" value={request.bagian} />
          <InfoRow label="Kelas" value={request.kelas} />
          <InfoRow label="Kontak" value={request.contact_phone} />
          <InfoRow label="Tgl Minta" value={request.request_date ? new Date(request.request_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'} />
          <InfoRow label="Tgl Diperlukan" value={request.needed_date ? new Date(request.needed_date).toLocaleDateString('id-ID', { dateStyle: 'medium' }) : '—'} />
          <InfoRow label="Diagnosa" value={request.diagnosis} />
          <InfoRow label="Hb" value={request.hemoglobin ? `${request.hemoglobin} g/%` : null} />
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

      {/* ── Existing Responses table ── */}
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
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{r.bag_number}</td>
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

      {/* ── Response Panel ── */}
      {!isFinished && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white text-sm font-bold"
              style={{ boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}>✎</div>
            <div>
              <h3 className="font-display font-bold text-gray-900">Respons Permintaan</h3>
              <p className="text-xs text-gray-400">Pilih apakah darah tersedia atau tidak</p>
            </div>
          </div>

          <AvailabilityToggle available={isAvailable} onChange={setIsAvailable} />

          {error && <div className="alert alert-error mb-5">⚠️ {error}</div>}

          {/* ─── Tidak Tersedia ─── */}
          {!isAvailable && (
            <form onSubmit={handleSendRejection} className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-bold text-red-700 mb-3 flex items-center gap-2">
                  <span>❌</span> Status: Darah Tidak Tersedia
                </p>
                <div>
                  <Label>Keterangan / Alasan</Label>
                  <textarea id="rejection-notes-input" className="input-field" rows={4}
                    placeholder="Contoh: Stok golongan darah O+ habis..."
                    value={rejectionNotes} onChange={e => setRejectionNotes(e.target.value)} />
                </div>
              </div>
              <button type="submit" id="send-rejection-btn" disabled={sendingRejection}
                className="w-full py-3 px-6 rounded-xl font-bold text-sm text-white transition-all"
                style={{ background: 'linear-gradient(135deg, #b91c1c, #7f1d1d)' }}>
                {sendingRejection ? <><span className="spinner" /> Mengirim...</> : '✕ Kirim Status Tidak Tersedia'}
              </button>
            </form>
          )}

          {/* ─── Darah Tersedia ─── */}
          {isAvailable && (
            <>
              {successCount > 0 && <div className="alert alert-success mb-5">✅ {successCount} kantong darah berhasil dicatat.</div>}

              <form onSubmit={handleSubmit} id="response-form" className="space-y-6">

                {/* A: Kantong */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-xs font-black">A</span>
                    Data Kantong Darah
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label required>Nomor Kantong</Label>
                      <input id="bag-number-input" type="text" className="input-field font-mono font-bold"
                        placeholder="e.g. UTD-2024-001234" value={form.bag_number}
                        onChange={e => update('bag_number', e.target.value)} required />
                    </div>
                    <div>
                      <Label>Tanggal Pengambilan</Label>
                      <input id="collection-date-input" type="date" className="input-field"
                        value={form.collection_date} onChange={e => update('collection_date', e.target.value)} />
                    </div>
                    <div>
                      <Label>Jenis Produk Darah</Label>
                      <select id="blood-category-select" className="input-field"
                        value={form.blood_category} onChange={e => update('blood_category', e.target.value)}>
                        <option value="">-- Pilih Jenis --</option>
                        {BLOOD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label>Jumlah (cc / Kantong)</Label>
                      <input id="volume-cc-input" type="text" className="input-field"
                        placeholder="e.g. 250 cc" value={form.volume_cc}
                        onChange={e => update('volume_cc', e.target.value)} />
                    </div>
                    <div>
                      <Label>Golongan Darah ABO</Label>
                      <div className="flex gap-2">
                        {BLOOD_TYPES.map(t => (
                          <button key={t} type="button" id={`resp-blood-type-${t}`} onClick={() => update('blood_type_abo', t)}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg border-2 transition-all ${
                              form.blood_type_abo === t ? 'border-red-500 bg-red-600 text-white' : 'border-gray-200 text-gray-500 hover:border-red-200'
                            }`}>{t}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label>Rhesus</Label>
                      <div className="flex gap-2">
                        {RHESUS_OPTIONS.map(r => (
                          <button key={r} type="button" id={`resp-rhesus-${r}`} onClick={() => update('rhesus', r)}
                            className={`flex-1 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                              form.rhesus === r ? 'border-red-500 bg-red-600 text-white' : 'border-gray-200 text-gray-500 hover:border-red-200'
                            }`}>{r}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* B: Petugas */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-black">B</span>
                    Petugas Pengeluaran (ATD/PTTD)
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Nama Petugas</Label>
                      <input id="officer-name-input" type="text" className="input-field"
                        placeholder="Nama petugas ATD/PTTD" value={form.officer_name}
                        onChange={e => update('officer_name', e.target.value)} />
                    </div>
                    <div>
                      <Label>Tanggal Pengeluaran</Label>
                      <input id="release-date-input" type="date" className="input-field"
                        value={form.release_date} onChange={e => update('release_date', e.target.value)} />
                    </div>
                    <div>
                      <Label>Jam Pengeluaran</Label>
                      <input id="release-time-input" type="time" className="input-field"
                        value={form.release_time} onChange={e => update('release_time', e.target.value)} />
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100" />

                {/* C: Penerima + Signature */}
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-black">C</span>
                    Data Penerima &amp; Tanda Tangan
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label>Nama Penerima (Keluarga / Petugas Pengambil)</Label>
                      <input id="receiver-name-input" type="text" className="input-field"
                        placeholder="Nama lengkap penerima darah" value={form.receiver_name}
                        onChange={e => update('receiver_name', e.target.value)} />
                    </div>

                    {/* ── Signature Canvas (immediately active) ── */}
                    <div>
                      <Label>Tanda Tangan Penerima</Label>
                      <div className="rounded-xl overflow-hidden border border-gray-100 bg-gray-50 p-3">
                        <p className="text-[10px] text-gray-400 font-medium mb-2 flex items-center gap-1">
                          <span>✍️</span> Canvas aktif — langsung tanda tangan di bawah:
                        </p>
                        <SignaturePad ref={sigRef} />
                      </div>
                    </div>
                  </div>
                </div>

                <button type="submit" id="save-response-btn" disabled={submitting}
                  className="btn-primary w-full justify-center">
                  {submitting ? <><span className="spinner" /> Menyimpan...</> : '+ Simpan Data Kantong Darah'}
                </button>
              </form>
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
  )
}
