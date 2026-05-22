'use client'

import { useState, useEffect } from 'react'

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

export default function RumahSakitProfilPage() {
  const [form, setForm] = useState({ name: '', phone_number: '', hospital_name: '', address: '' })
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const update = (k: keyof typeof form, v: string) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch('/api/v1/profile')
      .then(r => r.json())
      .then(d => {
        setForm({
          name:          d.name ?? '',
          phone_number:  d.phone_number ?? '',
          hospital_name: d.hospital_name ?? '',
          address:       d.address ?? '',
        })
        setEmail(d.email ?? '')
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
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const j = await res.json()
        throw new Error(j.error ?? 'Gagal menyimpan.')
      }
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="spinner" />
    </div>
  )

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Edit Profil Rumah Sakit</h1>
        <p className="text-gray-500 text-sm">Perbarui informasi institusi dan akun Anda.</p>
      </div>

      <div className="card p-6">
        <div className="flex flex-col gap-1 mb-5 pb-5 border-b border-gray-100">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Email Akun</p>
          <p className="text-sm font-semibold text-gray-700">{email}</p>
          <p className="text-xs text-gray-400">Email tidak dapat diubah.</p>
        </div>

        {success && <div className="alert alert-success mb-5">✅ Profil berhasil diperbarui.</div>}
        {error   && <div className="alert alert-error mb-5">⚠️ {error}</div>}

        <form onSubmit={handleSave} className="flex flex-col gap-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Informasi Institusi</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Field label="Nama Rumah Sakit">
            <input
              id="rs-profile-hospital-name"
              type="text"
              className="input-field"
              placeholder="Nama resmi rumah sakit"
              value={form.hospital_name}
              onChange={e => update('hospital_name', e.target.value)}
            />
          </Field>

          <Field label="Alamat RS">
            <input
              id="rs-profile-address"
              type="text"
              className="input-field"
              placeholder="Alamat lengkap rumah sakit"
              value={form.address}
              onChange={e => update('address', e.target.value)}
            />
          </Field>

          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Data PIC / Penanggung Jawab</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <Field label="Nama PIC">
            <input
              id="rs-profile-name"
              type="text"
              className="input-field"
              placeholder="Nama penanggung jawab akun"
              value={form.name}
              onChange={e => update('name', e.target.value)}
            />
          </Field>

          <Field label="Nomor WhatsApp / Telepon">
            <input
              id="rs-profile-phone"
              type="tel"
              className="input-field"
              placeholder="08xxxxxxxxxx"
              value={form.phone_number}
              onChange={e => update('phone_number', e.target.value.replace(/[^0-9]/g, ''))}
            />
          </Field>

          <button
            type="submit"
            id="rs-save-profile-btn"
            className="btn-primary"
            disabled={saving}
          >
            {saving ? <><span className="spinner" /> Menyimpan...</> : 'Simpan Perubahan'}
          </button>
        </form>
      </div>
    </div>
  )
}
