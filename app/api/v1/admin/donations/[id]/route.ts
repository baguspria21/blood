import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * PATCH /api/v1/admin/donations/[id] — Update a volunteer donation status
 * Body: { status: 'approved' | 'done' | 'rejected', admin_notes?: string }
 *
 * When status → 'done', also:
 *   - Increments blood_inventory for that blood type
 *   - Updates the volunteer's last_donated_at in profiles
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json()
    const { status, admin_notes } = body

    if (!['approved', 'done', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Status tidak valid' }, { status: 400 })
    }

    // Get the donation record first
    const { data: donation, error: fetchErr } = await supabase
      .from('volunteer_donations')
      .select('*, profiles:volunteer_id(name, blood_type, rhesus)')
      .eq('id', id)
      .single()

    if (fetchErr || !donation) {
      return NextResponse.json({ error: 'Donasi tidak ditemukan' }, { status: 404 })
    }

    // Update donation status
    const updateData: Record<string, unknown> = { status }
    if (admin_notes) updateData.admin_notes = admin_notes

    const { error: updateErr } = await supabase
      .from('volunteer_donations')
      .update(updateData)
      .eq('id', id)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

    // When marking as DONE → update inventory + volunteer's last_donated_at
    if (status === 'done') {
      // Increment blood inventory
      const { data: inv } = await supabase
        .from('blood_inventory')
        .select('bags_count')
        .eq('blood_type', donation.blood_type)
        .eq('rhesus', donation.rhesus)
        .single()

      const newCount = (inv?.bags_count ?? 0) + (donation.bags_donated ?? 1)

      await supabase
        .from('blood_inventory')
        .update({ bags_count: newCount, updated_by: user.id })
        .eq('blood_type', donation.blood_type)
        .eq('rhesus', donation.rhesus)

      // Update volunteer's last_donated_at
      await supabase
        .from('profiles')
        .update({ last_donated_at: new Date().toISOString() })
        .eq('id', donation.volunteer_id)
    }

    return NextResponse.json({ success: true, status })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
