'use client'

import { useEffect, useState } from 'react'

interface InventoryRow {
  id: string
  blood_type: string
  rhesus: string
  bags_count: number
}

interface BloodGroup {
  type: string
  total: number
  color: string
  textColor: string
}

const TYPE_CONFIG: Record<string, { color: string; textColor: string }> = {
  A:  { color: '#dc2626', textColor: '#7f1d1d' },
  B:  { color: '#2563eb', textColor: '#1e3a8a' },
  AB: { color: '#7c3aed', textColor: '#3b0764' },
  O:  { color: '#16a34a', textColor: '#14532d' },
}

function StockTile({ group }: { group: BloodGroup }) {
  const isEmpty = group.total === 0
  const isLow = group.total > 0 && group.total <= 5

  let bgColor = '#f0fdf4'
  let borderColor = '#86efac'
  let statusEmoji = '✅'
  let statusText = 'Cukup'
  let statusColor = '#16a34a'

  if (isEmpty) {
    bgColor = '#fef2f2'
    borderColor = '#fca5a5'
    statusEmoji = '🚨'
    statusText = 'Habis'
    statusColor = '#dc2626'
  } else if (isLow) {
    bgColor = '#fffbeb'
    borderColor = '#fde68a'
    statusEmoji = '⚠️'
    statusText = 'Menipis'
    statusColor = '#d97706'
  }

  return (
    <div
      className="rounded-2xl p-4 flex flex-col items-center gap-2 border-2 transition-all"
      style={{ background: bgColor, borderColor }}
    >
      <div
        className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
        style={{
          background: group.color,
          boxShadow: `0 4px 12px ${group.color}40`,
        }}
      >
        <span className="text-white font-display font-black text-base leading-none">{group.type}</span>
      </div>
      <div className="text-center">
        <p className="font-display text-2xl font-bold" style={{ color: group.textColor }}>
          {group.total}
        </p>
        <p className="text-[10px] text-gray-500 -mt-0.5">kantong</p>
      </div>
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: `${statusColor}18`, color: statusColor }}
      >
        {statusEmoji} {statusText}
      </span>
    </div>
  )
}

export function BloodStockWidget() {
  const [groups, setGroups] = useState<BloodGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch('/api/v1/admin/inventory')
        if (!res.ok) throw new Error('Gagal memuat stok darah')
        const data = await res.json()
        const rows: InventoryRow[] = data.inventory ?? []

        // Aggregate to 4 base types (sum + and -)
        const totals: Record<string, number> = { A: 0, B: 0, AB: 0, O: 0 }
        rows.forEach((row) => {
          if (row.blood_type in totals) {
            totals[row.blood_type] += row.bags_count
          }
        })

        const grouped: BloodGroup[] = Object.entries(totals).map(([type, total]) => ({
          type,
          total,
          color: TYPE_CONFIG[type].color,
          textColor: TYPE_CONFIG[type].textColor,
        }))
        setGroups(grouped)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan')
      } finally {
        setLoading(false)
      }
    }
    fetchInventory()
  }, [])

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="h-4 bg-gray-200 rounded w-36 animate-pulse" />
            <div className="h-3 bg-gray-100 rounded w-24 mt-1.5 animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-gray-100 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-5 text-center text-sm text-gray-400">
        ⚠️ {error}
      </div>
    )
  }

  const totalBags = groups.reduce((s, g) => s + g.total, 0)

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-display font-bold text-gray-900">🩸 Stok Darah Tersedia</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Total: <strong className="text-gray-700">{totalBags} kantong</strong> di semua golongan
          </p>
        </div>
        <span className="text-xs text-gray-400 italic">Update real-time</span>
      </div>
      <div className="grid grid-cols-4 gap-3" id="blood-stock-grid">
        {groups.map((g) => (
          <StockTile key={g.type} group={g} />
        ))}
      </div>
      <p className="text-[10px] text-gray-400 text-center mt-3">
        Data stok mencakup golongan darah Rh+ dan Rh−
      </p>
    </div>
  )
}
