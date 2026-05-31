import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ResponseForm } from '../_components/ResponseForm'
import { RequesterHistoryPanel } from '../_components/RequesterHistoryPanel'

export const metadata = { title: 'Detail Permintaan Transfusi — Admin | Blood-Connect Palu' }

export default async function AdminTransfusiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const [{ data: request }, { data: responses }] = await Promise.all([
    supabase
      .from('transfusion_requests')
      .select('*')
      .eq('id', id)
      .single(),
    supabase
      .from('transfusion_responses')
      .select('*')
      .eq('transfusion_request_id', id)
      .order('created_at', { ascending: false }),
  ])

  if (!request) notFound()

  // ── Try to find the hospital user account by contact_phone ──────────────────
  const { data: requesterProfile } = request.contact_phone
    ? await supabase
        .from('profiles')
        .select('id, name, phone_number, role')
        .eq('role', 'hospital')
        .eq('phone_number', request.contact_phone)
        .maybeSingle()
    : { data: null }

  // hospital_name comes from the request itself or requester profile name
  const hospitalName = request.requesting_hospital ?? null
  const profileName  = requesterProfile?.name ?? null
  const requesterUserId = requesterProfile?.id ?? null

  return (
    <div className="space-y-4">
      {/* Breadcrumb + Print */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <nav className="flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin" className="hover:text-red-600 transition-colors">Dashboard</Link>
          <span>›</span>
          <Link href="/admin/transfusi" className="hover:text-red-600 transition-colors">Transfusi</Link>
          <span>›</span>
          <span className="text-gray-800 font-medium">{request.patient_name}</span>
        </nav>
        <a
          href={`/api/v1/pdf/transfusion-response/${request.id}`}
          target="_blank"
          rel="noopener noreferrer"
          id="cetak-surat-pengeluaran-btn"
          className="text-sm font-bold text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-opacity hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)', boxShadow: '0 2px 8px rgba(220,38,38,0.3)' }}
        >
          🖨 Cetak Surat Pengeluaran
        </a>
      </div>

      {/* Two-column layout on large screens */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">

        {/* Left: Response form (takes 2/3 width on xl) */}
        <div className="xl:col-span-2">
          <ResponseForm request={request} existingResponses={responses ?? []} />
        </div>

        {/* Right: Requester history panel */}
        <div className="xl:col-span-1">
          {requesterUserId ? (
            <RequesterHistoryPanel
              userId={requesterUserId}
              hospitalName={hospitalName}
              profileName={profileName}
              contactPhone={request.contact_phone}
            />
          ) : (
            <div className="card p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #0891b2, #0e7490)' }}>
                  👤
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-900">Deskripsi & Riwayat Pemohon</h3>
                  <p className="text-xs text-gray-500">Profil rumah sakit & histori</p>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Nama RS / Institusi', value: hospitalName ?? '—' },
                  { label: 'Kontak',              value: request.contact_phone || '—' },
                  { label: 'Dokter',              value: request.requesting_doctor ?? '—' },
                  { label: 'Bagian / Ward',       value: request.bagian ?? '—' },
                  { label: 'Kelas Perawatan',     value: request.kelas ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
                    <p className="font-semibold text-gray-800 text-xs">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <p className="text-xs text-amber-700">
                  ℹ️ Akun rumah sakit tidak ditemukan berdasarkan nomor kontak ini. Riwayat lengkap tidak tersedia.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

