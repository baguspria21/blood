import Link from 'next/link'

function BloodDropIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2C12 2 5 10.5 5 15a7 7 0 0 0 14 0C19 10.5 12 2 12 2z" />
    </svg>
  )
}

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #fff1f2 0%, #ffffff 50%, #fff1f2 100%)' }}>

      {/* ── Nav ── */}
      <nav className="px-5 py-4 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center pulse-blood"
            style={{ boxShadow: '0 4px 14px rgba(220,38,38,0.35)' }}>
            <BloodDropIcon size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-gray-900 text-lg">
            Blood<span className="text-gradient">Connect</span>
            <span className="text-gray-400 font-medium text-sm ml-1">Palu</span>
          </span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" id="nav-login-btn"
            className="text-sm font-semibold text-red-600 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">
            Masuk
          </Link>
          <Link href="/daftar" id="nav-register-btn"
            className="text-sm font-semibold text-white px-4 py-2 rounded-lg gradient-brand transition-opacity hover:opacity-90"
            style={{ boxShadow: '0 4px 12px rgba(220,38,38,0.35)' }}>
            Daftar
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-5 py-16 text-center max-w-2xl mx-auto">
        <div className="w-24 h-24 rounded-3xl gradient-brand flex items-center justify-center mb-8 pulse-blood mx-auto"
          style={{ boxShadow: '0 12px 40px rgba(220,38,38,0.4)' }}>
          <BloodDropIcon size={44} className="text-white" />
        </div>

        <h1 className="font-display text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-4">
          Setiap Tetes Darah<br />
          <span className="text-gradient">Menyelamatkan Jiwa</span>
        </h1>

        <p className="text-gray-500 text-lg mb-10 max-w-md">
          Platform penghubung cepat antara pemohon darah darurat dengan relawan pendonor di Kota Palu.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <Link href="/darurat" id="hero-emergency-btn"
            className="btn-primary flex-1 justify-center">
            <BloodDropIcon size={18} />
            Butuh Darah Sekarang
          </Link>
          <Link href="/daftar" id="hero-volunteer-btn"
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3.5 rounded-[0.875rem] border-2 border-red-200 text-red-600 font-semibold hover:bg-red-50 transition-colors">
            Jadi Relawan
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mt-14 w-full max-w-md">
          {[
            { value: '500+', label: 'Relawan Aktif' },
            { value: '8', label: 'Rumah Sakit' },
            { value: '90', label: 'Hari Cooldown' },
          ].map((s) => (
            <div key={s.label} className="card p-4 text-center">
              <p className="font-display text-2xl font-bold text-gradient">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-5">
        © 2025 Blood-Connect Palu &middot; Didukung oleh PMI Kota Palu
      </footer>
    </div>
  )
}
