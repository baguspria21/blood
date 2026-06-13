'use client'

import { useEffect, useRef } from 'react'

// PMI Kota Palu (UTD) — Jl. Juanda No.63, Palu
const PMI_LAT = -0.8967
const PMI_LNG = 119.8693
const PMI_NAME = 'PMI Kota Palu (UTD)'
const PMI_ADDRESS = 'Jl. Juanda No.63, Palu Timur, Kota Palu'
const PMI_PHONE = '(0451) 421580'

// Google Maps direction link
const GMAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${PMI_LAT},${PMI_LNG}&travelmode=driving`

interface PmiPaluMapSectionProps {
  /** Visual theme: 'dark' for landing page, 'light' for volunteer dashboard */
  theme?: 'dark' | 'light'
}

export function PmiPaluMapSection({ theme = 'light' }: PmiPaluMapSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDark = theme === 'dark'

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.width
    const H = canvas.height

    // ── Background ──────────────────────────────────────────────
    ctx.fillStyle = isDark ? '#1a1033' : '#f0f9ff'
    ctx.fillRect(0, 0, W, H)

    // ── Grid lines (street grid effect) ─────────────────────────
    const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)'
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1
    for (let x = 0; x <= W; x += 40) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = 0; y <= H; y += 40) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    // ── Road network (Palu simplified) ──────────────────────────
    ctx.lineWidth = 5
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)'
    ctx.lineCap = 'round'

    // Horizontal "main roads"
    const roads = [
      [0, H * 0.3, W, H * 0.3],
      [0, H * 0.55, W, H * 0.55],
      [0, H * 0.75, W, H * 0.75],
    ]
    roads.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    })

    // Vertical "cross roads"
    const vroads = [
      [W * 0.25, 0, W * 0.25, H],
      [W * 0.5,  0, W * 0.5,  H],
      [W * 0.75, 0, W * 0.75, H],
    ]
    vroads.forEach(([x1, y1, x2, y2]) => {
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
    })

    // ── Jl. Juanda highlight ─────────────────────────────────────
    ctx.lineWidth = 7
    ctx.strokeStyle = isDark ? 'rgba(220,38,38,0.5)' : 'rgba(220,38,38,0.4)'
    ctx.setLineDash([12, 6])
    ctx.beginPath()
    ctx.moveTo(W * 0.1, H * 0.55)
    ctx.lineTo(W * 0.9, H * 0.55)
    ctx.stroke()
    ctx.setLineDash([])

    // ── Road label: Jl. Juanda ───────────────────────────────────
    ctx.font = `bold 11px Inter, sans-serif`
    ctx.fillStyle = isDark ? 'rgba(252,165,165,0.85)' : 'rgba(185,28,28,0.85)'
    ctx.fillText('Jl. Juanda', W * 0.12, H * 0.52)

    // ── Ripple circles around pin ────────────────────────────────
    const pinX = W * 0.5
    const pinY = H * 0.55

    ;[40, 28, 18].forEach((r, i) => {
      ctx.beginPath()
      ctx.arc(pinX, pinY, r, 0, Math.PI * 2)
      ctx.fillStyle = isDark
        ? `rgba(220,38,38,${0.05 + i * 0.04})`
        : `rgba(220,38,38,${0.06 + i * 0.05})`
      ctx.fill()
    })

    // ── Pin base (white circle) ──────────────────────────────────
    ctx.beginPath()
    ctx.arc(pinX, pinY, 12, 0, Math.PI * 2)
    ctx.fillStyle = '#ffffff'
    ctx.shadowColor = 'rgba(220,38,38,0.5)'
    ctx.shadowBlur = 16
    ctx.fill()
    ctx.shadowBlur = 0

    // ── Pin inner (red dot) ──────────────────────────────────────
    ctx.beginPath()
    ctx.arc(pinX, pinY, 7, 0, Math.PI * 2)
    const gradient = ctx.createRadialGradient(pinX - 2, pinY - 2, 1, pinX, pinY, 7)
    gradient.addColorStop(0, '#ef4444')
    gradient.addColorStop(1, '#b91c1c')
    ctx.fillStyle = gradient
    ctx.fill()

    // ── Label callout ────────────────────────────────────────────
    const labelX = pinX + 20
    const labelY = pinY - 36
    const boxW = 148
    const boxH = 36
    const radius = 8

    // Box background
    ctx.beginPath()
    ctx.moveTo(labelX + radius, labelY)
    ctx.lineTo(labelX + boxW - radius, labelY)
    ctx.quadraticCurveTo(labelX + boxW, labelY, labelX + boxW, labelY + radius)
    ctx.lineTo(labelX + boxW, labelY + boxH - radius)
    ctx.quadraticCurveTo(labelX + boxW, labelY + boxH, labelX + boxW - radius, labelY + boxH)
    ctx.lineTo(labelX + radius, labelY + boxH)
    ctx.quadraticCurveTo(labelX, labelY + boxH, labelX, labelY + boxH - radius)
    ctx.lineTo(labelX, labelY + radius)
    ctx.quadraticCurveTo(labelX, labelY, labelX + radius, labelY)
    ctx.closePath()
    ctx.fillStyle = isDark ? 'rgba(15,10,30,0.92)' : 'rgba(255,255,255,0.96)'
    ctx.shadowColor = 'rgba(0,0,0,0.2)'
    ctx.shadowBlur = 12
    ctx.fill()
    ctx.shadowBlur = 0

    // Box border
    ctx.strokeStyle = isDark ? 'rgba(220,38,38,0.4)' : 'rgba(220,38,38,0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Label text
    ctx.fillStyle = isDark ? '#fca5a5' : '#b91c1c'
    ctx.font = `bold 11px Inter, sans-serif`
    ctx.fillText('📍 PMI Kota Palu (UTD)', labelX + 10, labelY + 14)
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)'
    ctx.font = `10px Inter, sans-serif`
    ctx.fillText('Jl. Juanda No.63', labelX + 10, labelY + 28)

    // ── Compass rose ─────────────────────────────────────────────
    const cx = W - 28, cy = 28
    ctx.font = `bold 10px Inter, sans-serif`
    ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
    ctx.textAlign = 'center'
    ctx.fillText('N', cx, cy - 14)
    ctx.textAlign = 'start'

    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy + 10); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx + 10, cy); ctx.stroke()
  }, [isDark])

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={isDark
        ? { border: '1px solid rgba(255,255,255,0.08)' }
        : { border: '1px solid #ffe4e6', boxShadow: '0 4px 24px -4px rgba(220,38,38,0.12)' }
      }
    >
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between gap-4"
        style={isDark
          ? { background: 'rgba(255,255,255,0.04)' }
          : { background: 'white' }
        }
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 3px 8px rgba(220,38,38,0.3)' }}
          >
            🗺️
          </div>
          <div>
            <p className={`font-display font-bold text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>
              Lokasi PMI Kota Palu
            </p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {PMI_ADDRESS}
            </p>
          </div>
        </div>

        <a
          href={GMAPS_URL}
          target="_blank"
          rel="noopener noreferrer"
          id="pmi-get-directions-btn"
          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl transition-all whitespace-nowrap"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}
        >
          🧭 Petunjuk Arah
        </a>
      </div>

      {/* Canvas Map */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={600}
          height={220}
          className="w-full"
          style={{ display: 'block' }}
          aria-label={`Peta lokasi ${PMI_NAME}`}
        />
        {/* Coordinate badge */}
        <div
          className="absolute bottom-3 left-3 text-[10px] font-mono px-2 py-1 rounded-lg"
          style={isDark
            ? { background: 'rgba(0,0,0,0.6)', color: 'rgba(255,255,255,0.5)' }
            : { background: 'rgba(255,255,255,0.85)', color: 'rgba(0,0,0,0.45)' }
          }
        >
          {PMI_LAT}°, {PMI_LNG}°
        </div>
      </div>

      {/* Footer info strip */}
      <div
        className="px-5 py-3 flex items-center justify-between flex-wrap gap-2"
        style={isDark
          ? { background: 'rgba(220,38,38,0.08)', borderTop: '1px solid rgba(220,38,38,0.15)' }
          : { background: '#fff1f2', borderTop: '1px solid #ffe4e6' }
        }
      >
        <div className="flex items-center gap-4">
          <span className={`text-xs font-semibold flex items-center gap-1.5 ${isDark ? 'text-red-300' : 'text-red-700'}`}>
            📞 {PMI_PHONE}
          </span>
          <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Senin – Sabtu, 08:00 – 14:00
          </span>
        </div>
        <span className={`text-[10px] uppercase font-bold tracking-wide ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          Unit Donor Darah PMI
        </span>
      </div>
    </div>
  )
}
