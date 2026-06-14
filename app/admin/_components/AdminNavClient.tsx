'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  profileName: string
}

const NAV_LINKS = [
  { href: '/admin',          label: 'Dashboard', id: 'admin-nav-dashboard',  icon: '🏠', exact: true  },
  { href: '/admin/transfusi',label: 'Transfusi', id: 'admin-nav-transfusi',  icon: '🩸', exact: false },
  { href: '/admin/donasi',   label: 'Donasi',    id: 'admin-nav-donations',  icon: '💉', exact: false },
  { href: '/admin/relawan',  label: 'Relawan',   id: 'admin-nav-volunteers', icon: '🙋', exact: false },
  { href: '/admin/verify',   label: 'Verifikasi',id: 'admin-nav-verify',     icon: '✅', exact: false },
  { href: '/admin/pemohon',  label: 'Pemohon',   id: 'admin-nav-pemohon',    icon: '📋', exact: false },
  { href: '/admin/profil',   label: 'Profil',    id: 'admin-nav-profil',     icon: '👤', exact: false },
]

export function AdminNavClient({ profileName }: Props) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function isActive(link: typeof NAV_LINKS[number]) {
    return link.exact ? pathname === link.href : pathname.startsWith(link.href)
  }

  return (
    <>
      {/* ── Desktop nav (hidden on mobile) ─────────────────────── */}
      <nav className="hidden md:flex items-center gap-1">
        {NAV_LINKS.map(link => (
          <Link
            key={link.href}
            href={link.href}
            id={link.id}
            className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
              isActive(link)
                ? 'bg-red-50 text-red-600 font-semibold'
                : 'text-gray-600 hover:bg-red-50 hover:text-red-600'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      {/* ── Desktop: profile + logout ────────────────────────── */}
      <div className="hidden md:flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-800">{profileName}</p>
          <p className="text-[11px] text-red-500 font-medium">Administrator</p>
        </div>
        <form action="/api/v1/auth/logout" method="POST">
          <button
            type="submit"
            id="admin-logout-btn"
            className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
          >
            Keluar
          </button>
        </form>
      </div>

      {/* ── Mobile: hamburger button ─────────────────────────── */}
      <button
        id="admin-hamburger-btn"
        onClick={() => setOpen(v => !v)}
        aria-label={open ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={open}
        className="md:hidden flex flex-col justify-center items-center w-9 h-9 rounded-lg hover:bg-red-50 transition-colors gap-1.5 flex-shrink-0"
      >
        <span
          className="block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 origin-center"
          style={{ transform: open ? 'rotate(45deg) translateY(8px)' : 'none' }}
        />
        <span
          className="block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300"
          style={{ opacity: open ? 0 : 1, transform: open ? 'scaleX(0)' : 'none' }}
        />
        <span
          className="block w-5 h-0.5 bg-gray-700 rounded-full transition-all duration-300 origin-center"
          style={{ transform: open ? 'rotate(-45deg) translateY(-8px)' : 'none' }}
        />
      </button>

      {/* ── Mobile: backdrop ─────────────────────────────────── */}
      {open && (
        <div
          id="admin-nav-backdrop"
          className="fixed inset-0 z-30 bg-black/30 md:hidden"
          style={{ top: '56px' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile: slide-down drawer ─────────────────────────── */}
      <div
        id="admin-nav-drawer"
        className="md:hidden fixed left-0 right-0 z-40 transition-all duration-300 ease-in-out"
        style={{
          top: '56px',
          transform: open ? 'translateY(0)' : 'translateY(-150%)',
          background: 'white',
          boxShadow: open ? '0 8px 32px rgba(0,0,0,0.12)' : 'none',
          borderBottom: '1px solid #fecaca',
        }}
      >
        {/* Profile row */}
        <div className="px-4 py-3 border-b border-red-50 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}
          >
            🛡️
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{profileName}</p>
            <p className="text-[11px] text-red-500 font-medium">Administrator</p>
          </div>
        </div>

        {/* Nav links */}
        <nav className="p-3 space-y-1">
          {NAV_LINKS.map(link => {
            const active = isActive(link)
            return (
              <Link
                key={link.href}
                href={link.href}
                id={`mobile-${link.id}`}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all ${
                  active
                    ? 'bg-red-50 text-red-600 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-base">{link.icon}</span>
                {link.label}
                {active && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full"
                    style={{ background: '#dc2626' }}
                  />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="px-4 pb-4">
          <form action="/api/v1/auth/logout" method="POST">
            <button
              type="submit"
              id="admin-mobile-logout-btn"
              className="w-full text-sm font-semibold text-red-600 border-2 border-red-200 px-4 py-2.5 rounded-xl hover:bg-red-50 transition-colors"
            >
              Keluar dari Akun
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
