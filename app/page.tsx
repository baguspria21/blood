import Link from 'next/link'
import { PmiPaluMapSection } from './relawan/dashboard/_components/PmiPaluMapSection'

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

function HeartIcon({ size = 24, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
    </svg>
  )
}

// ── Educational Section Data ──────────────────────────────────────────────────
const WHY_DONATE_CARDS = [
  {
    emoji: '🏥',
    title: 'Menyelamatkan Nyawa',
    subtitle: 'Untuk Warga Palu',
    body:
      'Setiap 2 detik, seseorang di Indonesia membutuhkan transfusi darah. Satu kantong darah Anda bisa menyelamatkan hingga 3 nyawa warga Kota Palu — pasien bedah, ibu melahirkan, hingga korban kecelakaan.',
    accent: '#dc2626',
    bg: 'rgba(220,38,38,0.08)',
    border: 'rgba(220,38,38,0.2)',
  },
  {
    emoji: '🔴',
    title: 'Regenerasi Sel Darah',
    subtitle: 'Manfaat Kesehatan',
    body:
      'Setelah donor, tubuh memproduksi sel darah merah baru dalam 4–8 minggu. Proses ini menyegarkan sistem darah Anda dan meningkatkan kualitas sirkulasi tubuh secara keseluruhan.',
    accent: '#7c3aed',
    bg: 'rgba(124,58,237,0.08)',
    border: 'rgba(124,58,237,0.2)',
  },
  {
    emoji: '❤️',
    title: 'Menjaga Kesehatan Jantung',
    subtitle: 'Risiko Lebih Rendah',
    body:
      'Studi menunjukkan donor darah rutin dapat menurunkan risiko serangan jantung hingga 33%. Donor membantu mengurangi kekentalan darah yang menjadi faktor risiko utama penyakit kardiovaskular.',
    accent: '#0284c7',
    bg: 'rgba(2,132,199,0.08)',
    border: 'rgba(2,132,199,0.2)',
  },
  {
    emoji: '🤝',
    title: 'Solidaritas Komunitas',
    subtitle: 'Bersama Lebih Kuat',
    body:
      'Donor darah mempererat ikatan sosial. Di Kota Palu pasca-bencana 2018, semangat gotong royong ini terbukti menyelamatkan ratusan korban. Jadilah bagian dari gerakan kemanusiaan ini.',
    accent: '#16a34a',
    bg: 'rgba(22,163,74,0.08)',
    border: 'rgba(22,163,74,0.2)',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e1b4b 40%, #1a0a0a 100%)' }}>

      {/* ── Decorative orbs ── */}
      <div aria-hidden className="fixed top-0 right-0 w-[500px] h-[500px] rounded-full pointer-events-none opacity-20"
        style={{ background: 'radial-gradient(circle, #dc2626 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />
      <div aria-hidden className="fixed bottom-0 left-0 w-[400px] h-[400px] rounded-full pointer-events-none opacity-15"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)', transform: 'translate(-20%, 20%)' }} />
      <div aria-hidden className="fixed top-1/2 left-1/2 w-[600px] h-[600px] rounded-full pointer-events-none opacity-5"
        style={{ background: 'radial-gradient(circle, #dc2626 0%, transparent 70%)', transform: 'translate(-50%, -50%)' }} />

      {/* ── Nav ── */}
      <nav className="relative z-10 px-6 py-5 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center pulse-blood"
            style={{ boxShadow: '0 4px 14px rgba(220,38,38,0.5)' }}>
            <BloodDropIcon size={16} className="text-white" />
          </div>
          <span className="font-display font-bold text-white text-lg">
            Blood<span className="text-gradient">Connect</span>
            <span className="text-gray-400 font-medium text-sm ml-1">Palu</span>
          </span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" id="nav-login-btn"
            className="text-sm font-semibold text-gray-300 px-4 py-2 rounded-lg hover:text-white hover:bg-white/10 transition-all">
            Masuk
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-4xl mx-auto w-full">

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-2 rounded-full mb-8 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
          Platform Donor Darah — Kota Palu
        </div>

        {/* Headline */}
        <h1 className="font-display text-5xl md:text-4xl font-bold text-white leading-tight mb-6">
          Setiap Tetes Darah<br />
          <span className="text-gradient" style={{ fontSize: '30px' }}>Menyelamatkan Jiwa</span>
        </h1>

        <p className="text-gray-400 text-lg mb-16 max-w-xl mx-auto leading-relaxed">
          Platform penghubung antara Rumah Sakit yang membutuhkan darah dengan relawan pendonor di Kota Palu — cepat, terverifikasi, dan terpercaya.
        </p>

        {/* ── Dual Portal Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">

          {/* Hospital Portal */}
          <div className="group relative rounded-3xl overflow-hidden border border-white/10"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(220,38,38,0.3), rgba(185,28,28,0.15))', border: '1px solid rgba(220,38,38,0.3)' }}>
                <HospitalIcon size={28} className="text-red-400" />
              </div>

              <span className="text-xs font-bold text-red-400 uppercase tracking-widest mb-2">Portal Rumah Sakit</span>
              <h2 className="font-display text-xl font-bold text-white mb-3">Butuh Darah?</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Ajukan surat permintaan transfusi darah secara digital. Diproses langsung oleh tim UTD / Bank Darah.
              </p>

              <div className="flex flex-col gap-3 w-full">
                <Link href="/login" id="hospital-login-btn"
                  className="w-full py-3 px-5 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 14px rgba(220,38,38,0.4)' }}>
                  Masuk — Portal RS
                </Link>
                <Link href="/daftar-rs" id="hospital-register-btn"
                  className="w-full py-3 px-5 rounded-xl font-bold text-sm text-red-400 border border-red-500/30 hover:border-red-400 hover:bg-red-500/10 transition-all">
                  Daftarkan Rumah Sakit
                </Link>
              </div>
            </div>
          </div>

          {/* Volunteer Portal */}
          <div className="group relative rounded-3xl overflow-hidden border border-white/10"
            style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(20px)' }}>
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

            <div className="relative p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
                style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(91,33,182,0.15))', border: '1px solid rgba(124,58,237,0.3)' }}>
                <HeartIcon size={26} className="text-purple-400" />
              </div>

              <span className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-2">Portal Relawan</span>
              <h2 className="font-display text-xl font-bold text-white mb-3">Ingin Berdonor?</h2>
              <p className="text-gray-400 text-sm mb-6 leading-relaxed">
                Daftarkan diri sebagai relawan pendonor darah. dan jadilah salah satu penolong
              </p>

              <div className="flex flex-col gap-3 w-full">
                <Link href="/login" id="volunteer-login-btn"
                  className="w-full py-3 px-5 rounded-xl font-bold text-sm text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #5b21b6)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}>
                  Masuk — Portal Relawan
                </Link>
                <Link href="/daftar" id="volunteer-register-btn"
                  className="w-full py-3 px-5 rounded-xl font-bold text-sm text-purple-400 border border-purple-500/30 hover:border-purple-400 hover:bg-purple-500/10 transition-all">
                  Daftar Jadi Relawan
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats strip ── */}
        <div className="grid grid-cols-3 gap-6 w-full max-w-lg mt-16">
          {[
            { value: '500+', label: 'Relawan Aktif' },
            { value: '8', label: 'Rumah Sakit' },
            { value: '24/7', label: 'Siaga Penuh' },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="font-display text-2xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1 font-medium uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── PMI Palu Map Section ── */}
        <div className="w-full max-w-2xl mt-16">
          <div className="mb-5 text-center">
            <span className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
              📍 Lokasi Pusat Donor
            </span>
            <h2 className="font-display text-2xl font-bold text-white mt-3">
              Temukan PMI Kota Palu
            </h2>
            <p className="text-gray-400 text-sm mt-2">
              Unit Transfusi Darah PMI — tempat Anda bisa mendonorkan darah langsung.
            </p>
          </div>
          <PmiPaluMapSection theme="dark" />
        </div>

        {/* ── Educational Section: Mengapa Donor Darah Itu Penting? ── */}
        <div className="w-full max-w-2xl mt-20">
          <div className="mb-8 text-center">
            <span className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-gray-400 text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-widest">
              💡 Edukasi Donor
            </span>
            <h2 className="font-display text-2xl font-bold text-white mt-3">
              Mengapa Donor Darah Itu Penting?
            </h2>
            <p className="text-gray-400 text-sm mt-2 max-w-md mx-auto">
              Satu keputusan Anda hari ini bisa mengubah kehidupan seseorang di Kota Palu esok hari.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {WHY_DONATE_CARDS.map((card, i) => (
              <div
                key={i}
                className="group relative rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: card.bg,
                  border: `1px solid ${card.border}`,
                  backdropFilter: 'blur(10px)',
                }}
              >
                {/* Subtle glow on hover */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at 30% 30%, ${card.bg}, transparent 70%)` }}
                />

                <div className="relative">
                  {/* Icon */}
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-4"
                    style={{
                      background: `${card.accent}22`,
                      border: `1px solid ${card.accent}44`,
                    }}
                  >
                    {card.emoji}
                  </div>

                  {/* Label */}
                  <p
                    className="text-[10px] font-bold uppercase tracking-widest mb-1"
                    style={{ color: card.accent }}
                  >
                    {card.subtitle}
                  </p>

                  {/* Title */}
                  <h3 className="font-display text-base font-bold text-white mb-2">
                    {card.title}
                  </h3>

                  {/* Body */}
                  <p className="text-gray-400 text-sm leading-relaxed">
                    {card.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* CTA below educational section */}
          <div className="mt-8 text-center">
            <Link
              href="/daftar"
              id="edu-cta-register-btn"
              className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl text-white transition-all hover:opacity-90 hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 4px 16px rgba(220,38,38,0.4)' }}
            >
              🩸 Mulai Jadi Relawan Donor Sekarang
            </Link>
          </div>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center text-xs text-gray-600 py-6">
        © 2025 Blood-Connect Palu · Didukung oleh PMI Kota Palu
      </footer>
    </div>
  )
}
