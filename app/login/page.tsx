'use client'

import { useState, useTransition, useRef } from 'react'
import { getSupabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

function BloodDropIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // useTransition gives us isPending without causing extra renders.
  // The async work runs inside startTransition — it will NOT re-trigger
  // this component's render unless we explicitly call a state setter.
  const [isPending, startTransition]  = useTransition()

  // Hard guard: once we've successfully signed in and pushed a route,
  // ignore any subsequent calls (prevents the loop even if the component
  // somehow re-renders while the navigation is in flight).
  const redirected = useRef(false)

  // ── Event handler ─────────────────────────────────────────────────────
  // Strictly isolated inside onSubmit — never runs during render.
  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Bail out if already processing or already redirected
    if (isPending || redirected.current) return

    startTransition(async () => {
      setError(null)

      const supabase = getSupabase() // lazy singleton, not the Proxy

      // ── 1. Sign in ─────────────────────────────────────────────────
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email:    email.trim(),
        password: password,
      })

      if (loginError || !data.user) {
        const msg = loginError?.message ?? ''
        if (msg.includes('Invalid login') || msg.includes('invalid_credentials')) {
          setError('Email atau password salah. Silakan coba lagi.')
        } else if (msg.includes('Email not confirmed')) {
          setError('Email belum diverifikasi. Cek inbox Anda lalu klik link konfirmasi.')
        } else {
          setError(msg || 'Login gagal. Coba lagi.')
        }
        return // stop — do NOT redirect
      }

      // ── 2. Fetch role — one query, strictly inside this handler ────
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      // ── 3. Mark done BEFORE navigating — prevents any re-entry ─────
      redirected.current = true

      const destination = profile?.role === 'admin' ? '/admin' : '/relawan/dashboard'

      // Use hard navigation (window.location) instead of router.push.
      // This guarantees the proxy runs fresh with the new auth cookie.
      // router.push does a client-side transition which may not re-run
      // proxy.ts, causing the session to be invisible server-side.
      window.location.href = destination
    })
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #fff 60%)' }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-2 no-underline">
            <div
              className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center pulse-blood"
              style={{ boxShadow: '0 8px 24px rgba(220,38,38,0.35)' }}
            >
              <BloodDropIcon size={28} className="text-white" />
            </div>
            <p className="font-display text-xl font-bold text-gray-900">
              Blood<span className="text-gradient">Connect</span> Palu
            </p>
          </Link>
        </div>

        <div className="card p-6 md:p-8">
          <h1 className="font-display text-2xl font-bold text-gray-900 mb-1">Masuk</h1>
          <p className="text-gray-500 text-sm mb-7">Selamat datang kembali, pahlawan darah!</p>

          {error && (
            <div className="alert alert-error mb-5" role="alert" id="login-error-alert">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="flex flex-col gap-5" noValidate>
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-gray-700" htmlFor="login-email">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                className="input-field"
                placeholder="contoh@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={isPending}
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-gray-700" htmlFor="login-password">
                  Kata Sandi
                </label>
                <Link href="/lupa-password" className="text-xs text-red-600 hover:underline">
                  Lupa password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  className="input-field"
                  style={{ paddingRight: '3rem' }}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                />
                <button
                  type="button"
                  id="toggle-login-password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
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
            </div>

            {/* Submit */}
            <button
              type="submit"
              id="login-submit-btn"
              className="btn-primary"
              disabled={isPending || !email || !password}
              aria-busy={isPending}
            >
              {isPending ? (
                <>
                  <span className="spinner" />
                  Memproses...
                </>
              ) : (
                'Masuk ke Akun'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            Belum punya akun?{' '}
            <Link
              href="/daftar"
              id="go-to-register-link"
              className="text-red-600 font-semibold hover:underline"
            >
              Daftar sebagai relawan
            </Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          © 2025 Blood-Connect Palu &middot; Didukung oleh PMI Kota Palu
        </p>
      </div>
    </div>
  )
}
