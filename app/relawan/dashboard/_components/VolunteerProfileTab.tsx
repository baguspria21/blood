'use client'

import { useState, useEffect } from 'react'

const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const
const RHESUS_OPTIONS = [
  { value: '+', label: 'Positif (+)' },
  { value: '-', label: 'Negatif (−)' },
] as const

const KECAMATAN_PALU = [
  'Palu Barat', 'Palu Selatan', 'Palu Timur', 'Palu Utara',
  'Tatanga', 'Ulujadi', 'Mantikulore', 'Tawaeli',
]

interface ProfileData {
  name: string
  phone_number: string
  blood_type: string
  rhesus: string
  sub_district: string
  is_active: boolean
  email: string
  total_donations: number
}

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  )
}

export function VolunteerProfileTab() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [togglingActive, setTogglingActive] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form fields (editable)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [bloodType, setBloodType] = useState('A')
  const [rhesus, setRhesus] = useState('+')
  const [subDistrict, setSubDistrict] = useState('')
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    fetch('/api/v1/profile')
      .then(r => r.json())
      .then((d: ProfileData) => {
        setProfile(d)
        setName(d.name ?? '')
        setPhone(d.phone_number ?? '')
        setBloodType(d.blood_type ?? 'A')
        setRhesus(d.rhesus ?? '+')
        setSubDistrict(d.sub_district ?? '')
        setIsActive(d.is_active ?? true)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true); setError(null); setSuccess(false)
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone_number: phone,
          blood_type: bloodType,
          rhesus,
          sub_district: subDistrict,
          is_active: isActive,
        }),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Gagal menyimpan.')
      }
      setProfile(prev => prev ? { ...prev, name, phone_number: phone, blood_type: bloodType, rhesus, sub_district: subDistrict, is_active: isActive } : prev)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    setTogglingActive(true); setError(null)
    const newVal = !isActive
    try {
      const res = await fetch('/api/v1/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newVal }),
      })
      if (!res.ok) throw new Error('Gagal mengubah status.')
      setIsActive(newVal)
      setProfile(prev => prev ? { ...prev, is_active: newVal } : prev)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setTogglingActive(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="card p-8 text-center text-gray-400">
        <p className="text-3xl mb-2">⚠️</p>
        <p>Gagal memuat profil. Silakan refresh.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* ── Identity Card ── */}
      <div className="card p-6">
        <div className="flex items-center gap-4 mb-5">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-white text-2xl font-bold flex-shrink-0"
            style={{ boxShadow: '0 6px 20px rgba(220,38,38,0.3)' }}>
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h2 className="font-display text-xl font-bold text-gray-900">{profile.name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Blood type badge */}
              <span className="font-display font-black text-white text-sm px-2.5 py-0.5 rounded-lg"
                style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                {profile.blood_type}{profile.rhesus}
              </span>
              {/* Active status badge */}
              <span
                className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                style={isActive
                  ? { color: '#166534', background: '#dcfce7' }
                  : { color: '#92400e', background: '#fef3c7' }}
              >
                {isActive ? '● Aktif' : '⏸ Nonaktif'}
              </span>
              {/* Verified blood badge */}
              {profile.blood_type && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full border"
                  style={{ color: '#1d4ed8', background: '#dbeafe', borderColor: '#bfdbfe' }}>
                  ✓ Terverifikasi
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { label: 'Total Donasi',  value: profile.total_donations ?? 0,  color: '#dc2626', icon: '🩸' },
            { label: 'Kecamatan',    value: profile.sub_district || '—',    color: '#374151', icon: '📍' },
            { label: 'Status',       value: isActive ? 'Aktif' : 'Nonaktif', color: isActive ? '#15803d' : '#b45309', icon: isActive ? '✅' : '⏸' },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg mb-0.5">{icon}</p>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="font-display font-bold text-sm mt-0.5" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Active Status Toggle ── */}
      <div className="card p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-display font-bold text-gray-900">Status Ketersediaan Donor</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {isActive
                ? 'Anda sedang aktif dan akan menerima notifikasi permintaan darah yang sesuai.'
                : 'Anda sedang nonaktif. Notifikasi permintaan darah ditangguhkan sementara.'}
            </p>
          </div>
          <button
            id="toggle-active-btn"
            type="button"
            onClick={toggleActive}
            disabled={togglingActive}
            className="relative inline-flex items-center gap-3 px-5 py-2.5 rounded-xl font-bold text-sm transition-all"
            style={isActive
              ? { background: 'linear-gradient(135deg, #16a34a, #15803d)', color: 'white', boxShadow: '0 4px 14px rgba(22,163,74,0.3)' }
              : { background: '#f3f4f6', color: '#374151', border: '1.5px solid #e5e7eb' }}
          >
            {togglingActive ? (
              <><span className="spinner" style={{ borderColor: 'currentColor', borderTopColor: 'transparent' }} /> Mengubah...</>
            ) : isActive ? (
              <>✅ Aktif — Klik untuk Nonaktifkan</>
            ) : (
              <>⏸ Nonaktif — Klik untuk Aktifkan</>
            )}
          </button>
        </div>
      </div>

      {/* ── Edit Form ── */}
      <div className="card p-6">
        <h3 className="font-display font-bold text-gray-900 mb-5">Edit Informasi Profil</h3>

        {success && <div className="alert alert-success mb-5">✅ Profil berhasil diperbarui.</div>}
        {error   && <div className="alert alert-error mb-5">⚠️ {error}</div>}

        <form onSubmit={handleSave} className="space-y-5">
          {/* Name & Phone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel htmlFor="vol-name-input">Nama Lengkap</FieldLabel>
              <input
                id="vol-name-input"
                type="text"
                className="input-field"
                placeholder="Nama lengkap Anda"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <FieldLabel htmlFor="vol-phone-input">No. WhatsApp / Telepon</FieldLabel>
              <input
                id="vol-phone-input"
                type="tel"
                className="input-field"
                placeholder="08xxxxxxxxxx"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              />
            </div>
          </div>

          {/* Blood Type & Rhesus */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <FieldLabel>Golongan Darah</FieldLabel>
              <div className="flex gap-2" id="vol-blood-type-group">
                {BLOOD_TYPES.map(t => (
                  <button
                    key={t}
                    type="button"
                    id={`vol-blood-${t}`}
                    onClick={() => setBloodType(t)}
                    className="flex-1 py-2 text-sm font-bold rounded-xl border-2 transition-all"
                    style={bloodType === t
                      ? { borderColor: '#dc2626', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white' }
                      : { borderColor: '#e5e7eb', color: '#6b7280' }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Rhesus</FieldLabel>
              <div className="flex gap-2" id="vol-rhesus-group">
                {RHESUS_OPTIONS.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    id={`vol-rhesus-${r.value === '+' ? 'pos' : 'neg'}`}
                    onClick={() => setRhesus(r.value)}
                    className="flex-1 py-2 text-sm font-semibold rounded-xl border-2 transition-all"
                    style={rhesus === r.value
                      ? { borderColor: '#dc2626', background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white' }
                      : { borderColor: '#e5e7eb', color: '#6b7280' }}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sub District */}
          <div>
            <FieldLabel htmlFor="vol-subdistrict-select">Kecamatan (Lokasi Domisili)</FieldLabel>
            <select
              id="vol-subdistrict-select"
              className="input-field"
              value={subDistrict}
              onChange={e => setSubDistrict(e.target.value)}
            >
              <option value="">-- Pilih Kecamatan --</option>
              {KECAMATAN_PALU.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Kecamatan digunakan untuk mencocokkan relawan dengan permintaan darah terdekat.
            </p>
          </div>

          {/* Email (read-only) */}
          <div>
            <FieldLabel>Email Akun</FieldLabel>
            <div className="input-field bg-gray-50 text-gray-500 cursor-default" style={{ cursor: 'default' }}>
              {profile.email || '—'}
            </div>
            <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah.</p>
          </div>

          <button
            type="submit"
            id="vol-save-profile-btn"
            disabled={saving}
            className="btn-primary"
          >
            {saving ? <><span className="spinner" /> Menyimpan...</> : 'Simpan Perubahan Profil'}
          </button>
        </form>
      </div>

      {/* ── Donation History Info ── */}
      <div className="card p-5" style={{ background: '#fefce8', border: '1px solid #fde68a' }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">🩸</span>
          <div>
            <p className="font-semibold text-amber-900">
              Total Donasi Berhasil: <strong>{profile.total_donations ?? 0}×</strong>
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Jumlah donasi darah yang telah Anda selesaikan dan diverifikasi oleh sistem.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
