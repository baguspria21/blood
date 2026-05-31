import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabaseServer'

/**
 * GET  /api/v1/profile  — same as /api/v1/me (alias), includes total_donations
 * PATCH /api/v1/profile — update name, phone_number, is_active, blood_type, rhesus, sub_district
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const meta = user.user_metadata ?? {}

  // Count successful donations for volunteer users (table uses 'done' not 'completed')
  const { count: totalDonations } = await supabase
    .from('volunteer_donations')
    .select('*', { count: 'exact', head: true })
    .eq('volunteer_id', user.id)
    .eq('status', 'done')

  return NextResponse.json({
    ...profile,
    email: user.email,
    hospital_name: meta.hospital_name ?? '',
    address: meta.address ?? '',
    total_donations: totalDonations ?? 0,
  })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await req.json()
  const { name, phone_number, hospital_name, address, is_active, blood_type, rhesus, sub_district } = body

  // Update profiles table
  const profileUpdate: Record<string, unknown> = {}
  if (name?.trim())                  profileUpdate.name         = name.trim()
  if (phone_number?.trim())          profileUpdate.phone_number = phone_number.trim()
  if (address?.trim())               profileUpdate.sub_district = address.trim()
  if (sub_district?.trim())          profileUpdate.sub_district = sub_district.trim()
  if (typeof is_active === 'boolean') profileUpdate.is_active   = is_active
  if (blood_type)                    profileUpdate.blood_type   = blood_type
  if (rhesus)                        profileUpdate.rhesus       = rhesus

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase.from('profiles').update(profileUpdate).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update auth metadata (hospital_name, address) via service role
  if (hospital_name !== undefined || address !== undefined) {
    const service = createSupabaseServiceClient()
    const metaUpdate: Record<string, unknown> = { ...user.user_metadata }
    if (name?.trim())          metaUpdate.name          = name.trim()
    if (hospital_name?.trim()) metaUpdate.hospital_name = hospital_name.trim()
    if (address?.trim())       metaUpdate.address       = address.trim()

    await service.auth.admin.updateUserById(user.id, { user_metadata: metaUpdate })
  }

  return NextResponse.json({ success: true })
}

