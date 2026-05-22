'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

function BloodDropIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

function HospitalIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  )
}

function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

function SuccessScreen({ name }: { name: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #fff 60%)' }}>
      <div className="card w-full max-w-md p-8 text-center">
        <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center mx-auto mb-5 pulse-blood">
          <HospitalIcon size={32} className="text-white" />
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
          Pendaftaran Berhasil! 🏥
        </h1>
        <p className="text-gray-500 mb-6">
          Akun Rumah Sakit <strong>{name}</strong> berhasil didaftarkan. Cek email untuk verifikasi akun.
        </p>
        <div className="alert alert-success mb-6 text-left">
          <strong>Langkah selanjutnya:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Cek inbox email untuk link verifikasi</li>
            <li>Klik link untuk mengaktifkan akun</li>
            <li>Login dan ajukan permintaan transfusi</li>
          </ol>
        </div>
        <Link href="/login" id="go-to-login-btn" className="btn-primary" style={{ display: 'inline-flex', width: '100%' }}>
          Masuk ke Portal RS
        </Link>
        <Link href="/" className="block mt-4 text-sm text-red-600 font-medium hover:underline">
          Kembali ke Beranda
        </Link>
      </div>
    </div>
  )
}

export default function DaftarRumahSakitPage() {
  const [form, setForm] = useState({
    hospitalName: '',
    picName: '',
    phone: '',
    email: '',
    password: '',
    address: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const update = <K extends keyof typeof form>(key: K, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }))

  const isValid =
    form.hospitalName.trim().length >= 3 &&
    form.picName.trim().length >= 3 &&
    form.phone.trim().length >= 9 &&
    form.email.includes('@') &&
    form.password.length >= 8

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name:          form.picName.trim(),
            phone_number:  form.phone.trim(),
            hospital_name: form.hospitalName.trim(),
            address:       form.address.trim(),
            role:          'hospital',
          },
        },
      })

      if (authError) throw authError
      if (authData.user && authData.user.identities?.length === 0) {
        throw new Error('Email ini sudah terdaftar. Gunakan email lain.')
      }

      // Manually set the role to 'hospital' since the trigger defaults to 'volunteer'
      if (authData.user) {
        // The handle_new_user trigger will create the profile with role='volunteer'.
        // We update to 'hospital' immediately after using the service role via API.
        await fetch('/api/v1/auth/set-hospital-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: authData.user.id }),
        })
      }

      setSuccess(true)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan.'
      setError(msg.includes('already registered') ? 'Email ini sudah terdaftar.' : msg)
    } finally {
      setLoading(false)
    }
  }

  if (success) return <SuccessScreen name={form.hospitalName} />

  return (
    <div className="min-h-screen px-4 py-8 md:py-12"
      style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #ffffff 55%, #fff1f2 100%)' }}>

      <div className="relative z-10 w-full max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 no-underline">
            <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center pulse-blood"
              style={{ boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}>
              <HospitalIcon size={28} className="text-white" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-gray-900 leading-tight">
                Blood<span className="text-gradient">Connect</span> Palu
              </p>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Pendaftaran Rumah Sakit</p>
            </div>
          </Link>
        </div>

        <div className="card p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Daftarkan Rumah Sakit</h1>
          <p className="text-gray-500 text-sm mb-7">
            Buat akun portal RS untuk mengajukan permintaan transfusi darah secara digital.
          </p>

          {error && (
            <div className="alert alert-error mb-5" role="alert">
              <strong>Oops!</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            {/* Divider: Data RS */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Data Rumah Sakit</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Field label="Nama Rumah Sakit" required>
              <input
                id="rs-hospital-name"
                type="text"
                className="input-field"
                placeholder="RSUD Tora Belo / RS Anutapura..."
                value={form.hospitalName}
                onChange={e => update('hospitalName', e.target.value)}
                required
              />
            </Field>

            <Field label="Alamat RS" hint="Alamat lengkap rumah sakit">
              <input
                id="rs-address"
                type="text"
                className="input-field"
                placeholder="Jl. Trans Palu - Palolo..."
                value={form.address}
                onChange={e => update('address', e.target.value)}
              />
            </Field>

            {/* Divider: PIC */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Data Penanggung Jawab (PIC)</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Field label="Nama PIC / Petugas RS" required>
              <input
                id="rs-pic-name"
                type="text"
                className="input-field"
                placeholder="Nama lengkap penanggung jawab"
                value={form.picName}
                onChange={e => update('picName', e.target.value)}
                required
              />
            </Field>

            <Field label="Nomor WhatsApp / Telepon RS" required>
              <input
                id="rs-phone"
                type="tel"
                className="input-field"
                placeholder="08123456789"
                value={form.phone}
                onChange={e => update('phone', e.target.value.replace(/[^0-9]/g, ''))}
                required
              />
            </Field>

            {/* Divider: Akun */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Akun Login</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <Field label="Email" required>
              <input
                id="rs-email"
                type="email"
                className="input-field"
                placeholder="admin@rsud.go.id"
                value={form.email}
                onChange={e => update('email', e.target.value)}
                required
              />
            </Field>

            <Field label="Kata Sandi" required hint="Minimal 8 karakter">
              <div className="relative">
                <input
                  id="rs-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingRight: '3rem' }}
                  placeholder="Min. 8 karakter"
                  value={form.password}
                  onChange={e => update('password', e.target.value)}
                  required
                />
                <button
                  type="button"
                  id="rs-toggle-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword(p => !p)}
                >
                  {showPassword ? (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </Field>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Dengan mendaftar, data RS Anda akan digunakan untuk keperluan koordinasi transfusi darah oleh{' '}
              <span className="text-red-600 font-medium">PMI Kota Palu / UTD RSUD</span>.
            </p>

            <button
              type="submit"
              id="rs-submit-btn"
              className="btn-primary"
              disabled={loading || !isValid}
            >
              {loading ? (
                <><span className="spinner" /> Mendaftarkan...</>
              ) : (
                <><HospitalIcon size={18} /> Daftarkan Rumah Sakit</>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Sudah punya akun?{' '}
            <Link href="/login" id="rs-login-link" className="text-red-600 font-semibold hover:underline">
              Masuk di sini
            </Link>
          </p>
          <p className="text-center text-sm text-gray-500 mt-2">
            Daftar sebagai relawan?{' '}
            <Link href="/daftar" className="text-purple-600 font-semibold hover:underline">
              Klik di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
