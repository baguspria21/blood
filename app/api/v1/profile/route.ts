import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabaseServer'

/**
 * GET  /api/v1/profile  — same as /api/v1/me (alias)
 * PATCH /api/v1/profile — update name, phone_number, and optional metadata fields
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  const meta = user.user_metadata ?? {}
  return NextResponse.json({ ...profile, email: user.email, hospital_name: meta.hospital_name ?? '', address: meta.address ?? '' })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })

  const body = await req.json()
  const { name, phone_number, hospital_name, address } = body

  // Update profiles table
  const profileUpdate: Record<string, unknown> = {}
  if (name?.trim())         profileUpdate.name         = name.trim()
  if (phone_number?.trim()) profileUpdate.phone_number = phone_number.trim()
  if (address?.trim())      profileUpdate.sub_district = address.trim()

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
