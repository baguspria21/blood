import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * GET  /api/v1/admin/inventory — Fetch all blood inventory rows
 * PATCH /api/v1/admin/inventory — Update a specific blood type/rhesus stock
 *   Body: { blood_type, rhesus, bags_count } OR { blood_type, rhesus, delta }
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('blood_inventory')
      .select('*')
      .order('blood_type')
      .order('rhesus')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ inventory: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak' }, { status: 403 })
    }

    const body = await req.json()
    const { blood_type, rhesus } = body

    if (!blood_type || !rhesus) {
      return NextResponse.json({ error: 'blood_type dan rhesus harus diisi' }, { status: 400 })
    }

    // Support two modes: absolute set or delta increment
    if ('bags_count' in body) {
      const bags_count = Math.max(0, parseInt(body.bags_count, 10) || 0)
      const { data, error } = await supabase
        .from('blood_inventory')
        .update({ bags_count, updated_by: user.id })
        .eq('blood_type', blood_type)
        .eq('rhesus', rhesus)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ inventory: data })
    }

    if ('delta' in body) {
      const delta = parseInt(body.delta, 10) || 0
      // Fetch current value
      const { data: current } = await supabase
        .from('blood_inventory')
        .select('bags_count')
        .eq('blood_type', blood_type)
        .eq('rhesus', rhesus)
        .single()

      const newCount = Math.max(0, (current?.bags_count ?? 0) + delta)
      const { data, error } = await supabase
        .from('blood_inventory')
        .update({ bags_count: newCount, updated_by: user.id })
        .eq('blood_type', blood_type)
        .eq('rhesus', rhesus)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ inventory: data })
    }

    return NextResponse.json({ error: 'Sertakan bags_count atau delta' }, { status: 400 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
