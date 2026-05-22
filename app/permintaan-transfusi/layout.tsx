import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * Guard layout: only 'hospital' role can access /permintaan-transfusi
 */
export default async function TransfusiLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'hospital' && profile?.role !== 'admin') {
    redirect('/')
  }

  return <>{children}</>
}
