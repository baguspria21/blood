import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ResponseForm } from '../_components/ResponseForm'

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

      {/* Response form (client component) */}
      <ResponseForm request={request} existingResponses={responses ?? []} />
    </div>
  )
}
