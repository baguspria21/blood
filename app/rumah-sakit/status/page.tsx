import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import { HospitalStatusLive } from './_components/HospitalStatusLive'

export const metadata = { title: 'Status Permintaan — Portal Rumah Sakit | Blood-Connect Palu' }
export const dynamic = 'force-dynamic'

export default async function RumahSakitStatusPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch this hospital's most recent 30 transfusion requests
  const { data: requests } = await supabase
    .from('transfusion_requests')
    .select('id, patient_name, blood_type, rhesus, requesting_hospital, request_date, needed_date, status, rejection_notes, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  return (
    <HospitalStatusLive
      initialRequests={requests ?? []}
      userId={user.id}
    />
  )
}
