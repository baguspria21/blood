'use client'

import { useState } from 'react'

interface FaqItem {
  q: string
  steps: string[]
}


const VOLUNTEER_FAQ: FaqItem[] = [
  {
    q: 'Apa yang perlu dipersiapkan sebelum donor darah?',
    steps: [
      'Pastikan tubuh dalam kondisi sehat.',
      'Tidur cukup minimal 6–8 jam.',
      'Minum air putih yang cukup.',
      'Makanlah makanan yang cukup dan bergizi minimal 2 jam sebelumnya.',
      'Hindari alkohol minimal 24 jam sebelumnya.',
      'Jangan berpuasa minimal 4 jam sebelum donor.',
      'Hindari makanan berlemak tinggi minimal 2 jam sebelumnya.',
    ],
  },
  {
    q: 'Apa itu masa cooldown 60 hari?',
    steps: [
      'Cooldown adalah masa istirahat setelah donor darah.',
      'Selama masa cooldown Anda tidak dapat melakukan donor kembali.',
      'Status relawan akan berubah menjadi tidak tersedia sementara.',
      'Sistem akan menghitung masa cooldown secara otomatis.',
      'Setelah 60 hari, status relawan akan aktif kembali.',
    ],
  },
  {
    q: 'Apa yang harus dilakukan setelah donor darah?',
    steps: [
      'Perbanyak minum air putih.',
      'Hindari aktivitas berat selama beberapa jam.',
      'Istirahat cukup dan jangan begadang.',
      'Konsumsi makanan yang mengandung zat besi.',
      'Pantau kondisi tubuh setelah donor.',
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

      <div className="border-t border-gray-100" />

      <AccordionGroup
        title="Untuk Relawan (Pendonor)"
        emoji="🩸"
        color="#16a34a"
        items={VOLUNTEER_FAQ}
        openIndex={openIndex}
        onToggle={toggle}
        baseIndex={VOLUNTEER_FAQ.length}
      />
    </div>
  )
}
