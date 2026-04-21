'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

interface InventoryItem {
  id: string
  blood_type: string
  rhesus: string
  bags_count: number
  updated_at: string
}

const TYPE_COLORS: Record<string, string> = {
  'A+':  '#dc2626', 'A-':  '#ef4444',
  'B+':  '#2563eb', 'B-':  '#3b82f6',
  'AB+': '#7c3aed', 'AB-': '#8b5cf6',
  'O+':  '#16a34a', 'O-':  '#22c55e',
}

export default function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const fetchInventory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/inventory')
      const json = await res.json()
      setInventory(json.inventory ?? [])
    } catch {
      setError('Gagal memuat data stok')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInventory() }, [fetchInventory])

  const updateStock = async (item: InventoryItem, delta: number) => {
    const key = `${item.blood_type}${item.rhesus}`
    setUpdating(key)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch('/api/v1/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blood_type: item.blood_type,
          rhesus: item.rhesus,
          delta,
        }),
      })
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error ?? 'Gagal update')
      }
      setSuccess(`Stok ${key} berhasil diperbarui`)
      await fetchInventory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal update stok')
    } finally {
      setUpdating(null)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const setStockDirect = async (item: InventoryItem, newCount: number) => {
    const key = `${item.blood_type}${item.rhesus}`
    setUpdating(key)
    setError(null)
    try {
      const res = await fetch('/api/v1/admin/inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blood_type: item.blood_type,
          rhesus: item.rhesus,
          bags_count: newCount,
        }),
      })
      if (!res.ok) throw new Error('Update gagal')
      setSuccess(`Stok ${key} diset ke ${newCount}`)
      await fetchInventory()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal update stok')
    } finally {
      setUpdating(null)
      setTimeout(() => setSuccess(null), 3000)
    }
  }

  const totalBags = inventory.reduce((sum, i) => sum + i.bags_count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Stok Darah</h1>
          <p className="text-gray-500 text-sm">Kelola inventaris kantong darah PMI Kota Palu</p>
        </div>
        <Link href="/admin" className="text-sm text-gray-500 hover:text-red-600 transition-colors">
          ← Dashboard
        </Link>
      </div>

      {/* Alerts */}
      {error && <div className="alert alert-error">{error}</div>}
      {success && (
        <div className="px-4 py-3 rounded-xl text-sm font-medium text-green-800"
          style={{ background: '#dcfce7', border: '1px solid #86efac' }}>
          ✅ {success}
        </div>
      )}

      {/* Total Summary */}
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center"
            style={{ boxShadow: '0 4px 12px rgba(220,38,38,0.3)' }}
          >
            <span className="text-white text-2xl">🩸</span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Stok Tersedia</p>
            <p className="font-display text-3xl font-bold text-gray-900">{totalBags} <span className="text-lg text-gray-400 font-normal">kantong</span></p>
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="card p-5 animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-12 mb-3" />
              <div className="h-8 bg-gray-100 rounded w-16 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-full" />
            </div>
          ))}
        </div>
      )}

      {/* Inventory Grid */}
      {!loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {inventory.map((item) => {
            const key = `${item.blood_type}${item.rhesus}`
            const color = TYPE_COLORS[key] ?? '#6b7280'
            const isUpdating = updating === key
            const low = item.bags_count <= 3
            const empty = item.bags_count === 0

            return (
              <div
                key={item.id}
                id={`inventory-${key}`}
                className="card p-5 relative overflow-hidden transition-shadow hover:shadow-lg"
                style={empty ? { borderColor: '#fca5a5', borderWidth: 2 } : {}}
              >
                {/* Warning indicator for low stock */}
                {low && (
                  <div className="absolute top-3 right-3">
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-full"
                      style={{ background: empty ? '#fef2f2' : '#fffbeb', color: empty ? '#dc2626' : '#d97706' }}>
                      {empty ? 'KOSONG' : 'RENDAH'}
                    </span>
                  </div>
                )}

                {/* Blood type badge */}
                <div
                  className="w-12 h-12 rounded-xl flex flex-col items-center justify-center mb-3"
                  style={{ background: color, boxShadow: `0 4px 12px ${color}40` }}
                >
                  <span className="text-white font-display font-black text-sm leading-none">{item.blood_type}</span>
                  <span className="font-bold text-[10px]" style={{ color: 'rgba(255,255,255,0.7)' }}>{item.rhesus}</span>
                </div>

                {/* Count */}
                <p className="font-display text-3xl font-bold text-gray-900 mb-1">{item.bags_count}</p>
                <p className="text-xs text-gray-400 mb-3">kantong tersedia</p>

                {/* Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateStock(item, -1)}
                    disabled={isUpdating || item.bags_count === 0}
                    className="flex-1 text-sm font-bold py-1.5 rounded-lg border border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={item.bags_count}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val >= 0) setStockDirect(item, val)
                    }}
                    className="w-14 text-center py-1.5 rounded-lg border border-gray-200 text-sm font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    disabled={isUpdating}
                  />
                  <button
                    onClick={() => updateStock(item, 1)}
                    disabled={isUpdating}
                    className="flex-1 text-sm font-bold py-1.5 rounded-lg border border-gray-200 hover:bg-green-50 hover:text-green-600 hover:border-green-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    +
                  </button>
                </div>

                {/* Last updated */}
                <p className="text-[10px] text-gray-300 mt-2 text-center">
                  Update: {new Date(item.updated_at).toLocaleString('id-ID', {
                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
