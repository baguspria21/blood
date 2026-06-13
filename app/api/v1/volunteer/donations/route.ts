import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * GET  /api/v1/volunteer/donations — Fetch own donation requests
 * POST /api/v1/volunteer/donations — Create a new "Request to Donate"
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('volunteer_donations')
      .select('id, status, bags_donated, admin_notes, description, proof_url, created_at, blood_type, rhesus')
      .eq('volunteer_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ donations: data })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Fetch profile to fill blood type
    const { data: profile } = await supabase
      .from('profiles')
      .select('blood_type, rhesus, last_donated_at')
      .eq('id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profil tidak ditemukan' }, { status: 404 })

    // Check cooldown — 60 days since last donation (hard lockdown)
    if (profile.last_donated_at) {
      const lastDonated = new Date(profile.last_donated_at)
      const daysSince = Math.floor((Date.now() - lastDonated.getTime()) / (1000 * 60 * 60 * 24))
      if (daysSince < 60) {
        return NextResponse.json({
          error: `Anda masih dalam masa cooldown. ${60 - daysSince} hari lagi sebelum bisa donor.`,
        }, { status: 400 })
      }
    }

    // Check for existing pending donation
    const { data: existing } = await supabase
      .from('volunteer_donations')
      .select('id')
      .eq('volunteer_id', user.id)
      .in('status', ['pending', 'approved'])
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({
        error: 'Anda sudah memiliki permintaan donor aktif. Tunggu hingga selesai atau dibatalkan.',
      }, { status: 400 })
    }

    const body = await req.json().catch(() => ({}))
    const bags = Math.max(1, parseInt(body.bags_donated, 10) || 1)
    const description = typeof body.description === 'string' ? body.description.trim() : null

    const { data, error } = await supabase
      .from('volunteer_donations')
      .insert({
        volunteer_id: user.id,
        blood_type:   profile.blood_type,
        rhesus:       profile.rhesus,
        bags_donated: bags,
        description:  description || null,
        status:       'pending',
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ donation: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
