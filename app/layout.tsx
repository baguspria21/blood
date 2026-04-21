import type { Metadata } from 'next'
import { Inter, Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
})

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-plus-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Blood-Connect Palu — Platform Donor Darah Darurat',
  description:
    'Hubungkan pemohon darah dengan relawan pendonor di Kota Palu secara cepat dan terverifikasi. Sistem notifikasi WhatsApp otomatis berbasis golongan darah.',
  keywords: ['donor darah', 'PMI Palu', 'Blood Connect', 'transfusi darah Palu', 'relawan donor'],
  authors: [{ name: 'Blood-Connect Palu Team' }],
  openGraph: {
    title: 'Blood-Connect Palu',
    description: 'Platform Donor Darah Darurat Kota Palu',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id" className={`${inter.variable} ${plusJakartaSans.variable}`}>
      <body>{children}</body>
    </html>
  )
}
