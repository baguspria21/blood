'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

// ============================================================
// CONSTANTS
// ============================================================
const BLOOD_TYPES = ['A', 'B', 'AB', 'O'] as const
const RHESUS_OPTIONS = [
  { label: 'Positif (+)', value: '+' },
  { label: 'Negatif (−)', value: '-' },
] as const

// Sub-districs (Kecamatan) di Kota Palu
const SUB_DISTRICTS = [
  'Palu Barat',
  'Palu Selatan',
  'Palu Timur',
  'Palu Utara',
  'Tatanga',
  'Ulujadi',
  'Mantikulore',
  'Tawaeli',
]

type BloodType = (typeof BLOOD_TYPES)[number]
type BloodTypeOrUnknown = BloodType | 'tidak_tahu'
type Rhesus = '+' | '-'

interface FormData {
  name: string
  phone: string
  email: string
  password: string
  blood_type: BloodTypeOrUnknown | ''
  rhesus: Rhesus | ''
  sub_district: string
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

/** Blood drop SVG icon */
function BloodDropIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

/** Step indicator at the top */
function StepBadge({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            i < step ? 'w-8 bg-red-600' : i === step - 1 ? 'w-8 bg-red-600' : 'w-4 bg-red-200'
          }`}
        />
      ))}
    </div>
  )
}

/** Segmented button group (Blood Type / Rhesus) */
function SegmentGroup<T extends string>({
  options,
  value,
  onChange,
  id,
}: {
  options: readonly { label: string; value: T }[] | readonly T[]
  value: T | ''
  onChange: (val: T) => void
  id: string
}) {
  const normalized =
    typeof options[0] === 'string'
      ? (options as readonly T[]).map((o) => ({ label: o, value: o }))
      : (options as readonly { label: string; value: T }[])

  return (
    <div className="segment-group" role="group" aria-label={id}>
      {normalized.map((opt) => (
        <button
          key={opt.value}
          type="button"
          id={`${id}-${opt.value}`}
          className={`segment-option ${value === opt.value ? 'active' : ''}`}
          onClick={() => onChange(opt.value)}
          aria-pressed={value === opt.value}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

/** Field wrapper with label */
function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
}

// ============================================================
// SUCCESS SCREEN
// ============================================================
function SuccessScreen({ name }: { name: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #fff 60%)' }}>
      <div className="card w-full max-w-md p-8 text-center" style={{ animation: 'fadeInUp 0.5s ease' }}>
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full gradient-brand flex items-center justify-center pulse-blood">
            <BloodDropIcon size={36} className="text-white" />
          </div>
        </div>
        <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">
          Selamat Datang, {name}! 🎉
        </h1>
        <p className="text-gray-500 mb-6">
          Akun Anda berhasil didaftarkan. Cek email Anda untuk verifikasi, lalu Anda siap menjadi pahlawan darah!
        </p>
        <div className="alert alert-success mb-6 text-left">
          <strong>Langkah selanjutnya:</strong>
          <ol className="list-decimal list-inside mt-1 space-y-1">
            <li>Cek inbox email untuk link verifikasi</li>
            <li>Klik link untuk mengaktifkan akun</li>
            <li>Aktifkan notifikasi WhatsApp</li>
          </ol>
        </div>
        <Link
          href="/login"
          id="go-to-login-btn"
          className="btn-primary"
          style={{ display: 'inline-flex', width: '100%' }}
        >
          Masuk ke Akun
        </Link>
        <Link href="/" className="block mt-4 text-sm text-red-600 font-medium hover:underline">
          Kembali ke Beranda
        </Link>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  )
}

// ============================================================
// MAIN REGISTRATION PAGE
// ============================================================
export default function DaftarRelawanPage() {
  const [form, setForm] = useState<FormData>({
    name: '',
    phone: '',
    email: '',
    password: '',
    blood_type: '',
    rhesus: '',
    sub_district: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // ---- Validation ----
  const isFormValid =
    form.name.trim().length >= 3 &&
    form.phone.trim().length >= 9 &&
    form.email.includes('@') &&
    form.password.length >= 8 &&
    form.blood_type !== '' &&
    (form.blood_type === 'tidak_tahu' || form.rhesus !== '') &&
    form.sub_district !== ''

  // ---- Handlers ----
  const updateField = <K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid) return
    setLoading(true)
    setError(null)

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            name:         form.name.trim(),
            phone_number: form.phone.trim(),
            blood_type:   form.blood_type === 'tidak_tahu' ? null : form.blood_type,
            rhesus:       form.blood_type === 'tidak_tahu' ? null : form.rhesus,
            sub_district: form.sub_district,
          },
        },
      })

      if (authError) throw authError

      if (authData.user && authData.user.identities?.length === 0) {
        throw new Error('Email ini sudah terdaftar. Gunakan email lain atau langsung masuk.')
      }

      setSuccess(true)

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.'

      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('sudah terdaftar')) {
        setError('Email ini sudah terdaftar. Gunakan email lain atau langsung masuk.')
      } else if (msg.includes('Password should be')) {
        setError('Password minimal 8 karakter.')
      } else if (msg.includes('duplicate key') && msg.includes('phone_number')) {
        setError('Nomor WhatsApp ini sudah terdaftar.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  // ---- Success State ----
  if (success) return <SuccessScreen name={form.name.split(' ')[0]} />

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div
      className="min-h-screen px-4 py-8 md:py-12"
      style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #ffffff 55%, #fff1f2 100%)' }}
    >
      <div
        aria-hidden
        className="fixed top-0 right-0 w-72 h-72 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #dc2626, transparent 70%)', transform: 'translate(30%, -30%)' }}
      />
      <div
        aria-hidden
        className="fixed bottom-0 left-0 w-48 h-48 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #dc2626, transparent 70%)', transform: 'translate(-30%, 30%)' }}
      />

      <div className="relative z-10 w-full max-w-md mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 no-underline">
            <div
              className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center pulse-blood"
              style={{ boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}
            >
              <BloodDropIcon size={28} className="text-white" />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-gray-900 leading-tight">
                Blood<span className="text-gradient">Connect</span> Palu
              </p>
              <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">PMI Kota Palu</p>
            </div>
          </Link>
        </div>

        <div className="card p-6 md:p-8">
          <StepBadge step={1} total={1} />

          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">
            Daftar Sebagai Relawan
          </h1>
          <p className="text-gray-500 text-sm mb-7">
            Jadi pahlawan darah. Isi data diri Anda untuk mulai menerima notifikasi permintaan darah.
          </p>

          {error && (
            <div className="alert alert-error mb-5" role="alert" id="reg-error-alert">
              <strong>Oops!</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">

            <Field label="Nama Lengkap" required>
              <input
                id="reg-name"
                type="text"
                className="input-field"
                placeholder="Contoh: Ahmad Fauzi"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                autoComplete="name"
                required
              />
            </Field>

            <Field
              label="Nomor WhatsApp"
              required
              hint="Pastikan aktif — notifikasi permintaan darah dikirim ke sini"
            >
              <div className="relative">
                <span
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium pointer-events-none select-none"
                >
                  +62
                </span>
                <input
                  id="reg-phone"
                  type="tel"
                  className="input-field"
                  style={{ paddingLeft: '3rem' }}
                  placeholder="812 3456 7890"
                  value={form.phone}
                  onChange={(e) => updateField('phone', e.target.value.replace(/[^0-9]/g, ''))}
                  autoComplete="tel"
                  required
                />
              </div>
            </Field>

            <Field label="Email" required>
              <input
                id="reg-email"
                type="email"
                className="input-field"
                placeholder="contoh@email.com"
                value={form.email}
                onChange={(e) => updateField('email', e.target.value)}
                autoComplete="email"
                required
              />
            </Field>

            <Field label="Kata Sandi" required hint="Minimal 8 karakter">
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingRight: '3rem' }}
                  placeholder="Min. 8 karakter"
                  value={form.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  id="toggle-password-btn"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
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

            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium whitespace-nowrap">Data Medis</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Golongan Darah */}
            <Field label="Golongan Darah" required>
              <div className="space-y-2">
                <SegmentGroup<BloodType>
                  id="blood-type"
                  options={BLOOD_TYPES}
                  value={form.blood_type === 'tidak_tahu' ? '' : form.blood_type as BloodType | ''}
                  onChange={(val) => updateField('blood_type', val)}
                />
                {/* Tidak Tahu option */}
                <button
                  type="button"
                  id="blood-type-tidak-tahu"
                  className={`w-full py-2 px-4 rounded-xl text-sm font-semibold border-2 transition-all ${
                    form.blood_type === 'tidak_tahu'
                      ? 'border-gray-400 bg-gray-600 text-white'
                      : 'border-gray-200 text-gray-400 hover:border-gray-400 hover:text-gray-600'
                  }`}
                  onClick={() => updateField('blood_type', 'tidak_tahu')}
                  aria-pressed={form.blood_type === 'tidak_tahu'}
                >
                  🤷 Tidak Tahu Golongan Darah
                </button>
                {form.blood_type === 'tidak_tahu' && (
                  <p className="text-xs text-gray-400 px-1">
                    Tidak masalah! Anda tetap bisa mendaftar. Golongan darah bisa diperbarui nanti setelah pemeriksaan.
                  </p>
                )}
              </div>
            </Field>

            {/* Rhesus — only shown if blood type is known */}
            {form.blood_type !== 'tidak_tahu' && (
            <Field label="Rhesus" required>
              <SegmentGroup<Rhesus>
                id="rhesus"
                options={RHESUS_OPTIONS}
                value={form.rhesus}
                onChange={(val) => updateField('rhesus', val)}
              />
            </Field>
            )}

            {/* Kecamatan */}
            <Field
              label="Kecamatan (Domisili)"
              required
              hint="Digunakan untuk koordinasi relawan terdekat"
            >
              <select
                id="reg-sub-district"
                className="input-field"
                value={form.sub_district}
                onChange={(e) => updateField('sub_district', e.target.value)}
                required
              >
                <option value="" disabled>Pilih kecamatan...</option>
                {SUB_DISTRICTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </Field>

            {/* Terms */}
            <p className="text-xs text-gray-400 text-center leading-relaxed">
              Dengan mendaftar, Anda menyetujui bahwa data ini digunakan untuk keperluan koordinasi donor darah oleh&nbsp;
              <span className="text-red-600 font-medium">PMI Kota Palu</span>.
            </p>

            {/* Submit Button */}
            <button
              type="submit"
              id="reg-submit-btn"
              className="btn-primary"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  Mendaftarkan...
                </>
              ) : (
                <>
                  <BloodDropIcon size={18} />
                  Daftar Jadi Relawan
                </>
              )}
            </button>
          </form>

          {/* ── Login Link ── */}
          <p className="text-center text-sm text-gray-500 mt-5">
            Sudah punya akun?{' '}
            <Link href="/login" id="go-to-login-link" className="text-red-600 font-semibold hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 Blood-Connect Palu &middot; Didukung oleh PMI Kota Palu
        </p>
      </div>
    </div>
  )
}
