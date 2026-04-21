import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * GET /api/v1/admin/requests?status=pending|approved|rejected|completed
 * Returns blood requests filtered by status (admin only).
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
    }

    const status = req.nextUrl.searchParams.get('status')

    let query = supabase
      .from('blood_requests')
      .select(`
        id, patient_name, contact_phone, blood_type, rhesus,
        bags_needed, bags_fulfilled, proof_url, status,
        admin_notes, created_at,
        hospitals ( name, address, phone )
      `)
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: requests, error } = await query

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ requests: requests ?? [] })
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
