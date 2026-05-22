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
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500">
        <Link href="/admin" className="hover:text-red-600 transition-colors">Dashboard</Link>
        <span>›</span>
        <Link href="/admin/transfusi" className="hover:text-red-600 transition-colors">Transfusi</Link>
        <span>›</span>
        <span className="text-gray-800 font-medium">{request.patient_name}</span>
      </nav>

      {/* Response form (client component) */}
      <ResponseForm request={request} existingResponses={responses ?? []} />
    </div>
  )
}
