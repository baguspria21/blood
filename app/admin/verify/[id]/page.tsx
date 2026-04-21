import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import VerifyClient from './VerifyClient'

export const metadata = {
  title: 'Pusat Verifikasi — Blood-Connect Palu',
}

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function VerifyPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createSupabaseServerClient()

  const { data: request, error } = await supabase
    .from('blood_requests')
    .select('*, hospitals(id, name, address)')
    .eq('id', id)
    .single()

  if (error || !request) {
    redirect('/admin/permintaan')
  }

  // Prevent re-verifying completed/already approved requests here
  if (request.status !== 'pending') {
    redirect('/admin/permintaan')
  }

  return <VerifyClient request={request} />
}
