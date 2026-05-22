import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * GET /api/v1/me
 * Returns the current authenticated user's profile row + auth metadata.
 */
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // hospital_name may be stored in auth metadata (set at signup)
  const meta = user.user_metadata ?? {}

  return NextResponse.json({
    id:           user.id,
    email:        user.email,
    name:         profile?.name ?? meta.name ?? '',
    phone_number: profile?.phone_number ?? meta.phone_number ?? '',
    role:         profile?.role ?? 'volunteer',
    hospital_name: meta.hospital_name ?? '',
    address:      meta.address ?? profile?.sub_district ?? '',
    blood_type:   profile?.blood_type,
    rhesus:       profile?.rhesus,
  })
}
