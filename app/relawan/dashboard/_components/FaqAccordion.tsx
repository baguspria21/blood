'use client'

import { useState } from 'react'

interface FaqItem {
  q: string
  steps: string[]
}

const APPLICANT_FAQ: FaqItem[] = [
  {
    q: 'Bagaimana cara mengajukan permintaan darah darurat?',
    steps: [
      'Buka halaman "Butuh Darah Sekarang" dari beranda atau kunjungi /darurat.',
      'Isi formulir: nama pasien, nomor kontak, rumah sakit tujuan, golongan darah, rhesus, dan jumlah kantong.',
      'Upload foto Surat Rujukan RS sebagai bukti kebutuhan darah.',
      'Klik "Kirim Permintaan" — permintaan akan masuk dengan status PENDING.',
      'Admin PMI akan memverifikasi dokumen Anda dalam waktu singkat.',
      'Jika disetujui, relawan yang cocok akan otomatis dihubungi via WhatsApp.',
      'Pantau status permintaan Anda menggunakan ID yang diberikan setelah pengiriman.',
    ],
  },
  {
    q: 'Berapa lama proses verifikasi permintaan darah?',
    steps: [
      'Admin PMI biasanya memproses permintaan dalam 15–30 menit.',
      'Untuk kasus CITO/darurat, proses dipercepat dan blast ke relawan dilakukan seketika.',
      'Jika dokumen tidak lengkap atau tidak valid, permintaan akan ditolak dengan catatan alasan.',
      'Anda akan menerima notifikasi melalui nomor kontak yang didaftarkan.',
    ],
  },
  {
    q: 'Apa yang dimaksud dengan Surat Rujukan RS?',
    steps: [
      'Surat Rujukan RS adalah dokumen resmi dari dokter/rumah sakit yang menyatakan kebutuhan transfusi darah.',
      'Dokumen harus mencantumkan: nama pasien, golongan darah yang dibutuhkan, tanda tangan dokter, dan stempel RS.',
      'Format yang diterima: foto JPG, PNG, atau file PDF.',
      'Tanpa dokumen ini, permintaan tidak dapat diverifikasi dan akan ditolak.',
    ],
  },
]

const VOLUNTEER_FAQ: FaqItem[] = [
  {
    q: 'Bagaimana cara menjadi relawan pendonor darah?',
    steps: [
      'Daftar akun melalui halaman Daftar di beranda.',
      'Lengkapi profil: nama, nomor WhatsApp, golongan darah, rhesus, dan kecamatan tempat tinggal.',
      'Akun Anda akan aktif dan siap menerima notifikasi permintaan darah.',
      'Pastikan nomor WhatsApp aktif agar bisa menerima broadcast dari sistem.',
    ],
  },
  {
    q: 'Bagaimana cara merespons permintaan donor?',
    steps: [
      'Saat ada permintaan darah yang cocok, Anda akan mendapat pesan WhatsApp dari sistem.',
      'Pesan berisi detail pasien, golongan darah yang dibutuhkan, dan lokasi rumah sakit.',
      'Buka link yang diberikan di WhatsApp dan klik "Konfirmasi Hadir".',
      'Datang ke RS sesuai jadwal yang telah ditetapkan admin.',
      'Setelah donor selesai, status Anda akan masuk masa cooldown 90 hari.',
    ],
  },
  {
    q: 'Apa itu Masa Cooldown 90 Hari?',
    steps: [
      'Setelah berhasil donor darah, Anda tidak dapat donor lagi selama 90 hari.',
      'Ini adalah standar medis untuk menjaga kesehatan pendonor.',
      'Status Anda akan otomatis aktif kembali setelah 90 hari berlalu.',
      'Selama cooldown, Anda masih bisa melihat permintaan darah tetapi tidak dapat merespons.',
    ],
  },
  {
    q: 'Bagaimana cara mengajukan donor mandiri (tanpa diminta)?',
    steps: [
      'Di dashboard, klik tombol "Ajukan Donor" jika status Anda aktif (tidak cooldown).',
      'Admin PMI akan menjadwalkan sesi donor Anda.',
      'Anda akan mendapat konfirmasi jadwal melalui WhatsApp.',
      'Datang ke lokasi yang ditentukan sesuai jadwal.',
    ],
  },
]

interface AccordionGroupProps {
  title: string
  emoji: string
  color: string
  items: FaqItem[]
  openIndex: number | null
  onToggle: (index: number) => void
  baseIndex: number
}

function AccordionGroup({ title, emoji, color, items, openIndex, onToggle, baseIndex }: AccordionGroupProps) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl">{emoji}</span>
        <h3 className="font-display font-bold text-gray-800 text-sm uppercase tracking-wide">{title}</h3>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => {
          const idx = baseIndex + i
          const isOpen = openIndex === idx
          return (
            <div
              key={idx}
              className="rounded-xl border overflow-hidden transition-all"
              style={{ borderColor: isOpen ? color : '#e5e7eb' }}
            >
              <button
                id={`faq-item-${idx}`}
                onClick={() => onToggle(idx)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left transition-colors"
                style={{ background: isOpen ? `${color}12` : 'white' }}
              >
                <span className="font-semibold text-gray-800 text-sm pr-4">{item.q}</span>
                <span
                  className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold transition-transform"
                  style={{
                    background: isOpen ? color : '#e5e7eb',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    color: isOpen ? 'white' : '#9ca3af',
                  }}
                >
                  +
                </span>
              </button>

              <div
                className="overflow-hidden transition-all duration-300"
                style={{ maxHeight: isOpen ? '400px' : '0px' }}
              >
                <div className="px-4 pb-4 pt-1">
                  <ol className="space-y-2">
                    {item.steps.map((step, si) => (
                      <li key={si} className="flex items-start gap-3 text-sm text-gray-600">
                        <span
                          className="flex-shrink-0 w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center mt-0.5"
                          style={{ background: color }}
                        >
                          {si + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggle = (idx: number) => setOpenIndex((prev) => (prev === idx ? null : idx))

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="font-display font-bold text-gray-900">❓ Panduan Penggunaan</h2>
        <p className="text-xs text-gray-400 mt-0.5">Klik pertanyaan untuk melihat langkah-langkah</p>
      </div>

      <AccordionGroup
        title="Untuk Pemohon (Butuh Darah)"
        emoji="🆘"
        color="#dc2626"
        items={APPLICANT_FAQ}
        openIndex={openIndex}
        onToggle={toggle}
        baseIndex={0}
      />

      <div className="border-t border-gray-100" />

      <AccordionGroup
        title="Untuk Relawan (Pendonor)"
        emoji="🩸"
        color="#16a34a"
        items={VOLUNTEER_FAQ}
        openIndex={openIndex}
        onToggle={toggle}
        baseIndex={APPLICANT_FAQ.length}
      />
    </div>
  )
}
