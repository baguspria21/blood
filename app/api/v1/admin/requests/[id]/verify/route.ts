import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabaseServer'

/**
 * PATCH /api/v1/admin/requests/[id]/verify
 * Body: { action: 'approve' | 'reject', notes?: string }
 *
 * Logic:
 * 1. Verify caller is an admin (via session cookie)
 * 2. Update blood_request status
 * 3. If approved → query matching volunteers and invoke notify-volunteers Edge Function
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params

  try {
    const body = await req.json() as { action: 'approve' | 'reject'; notes?: string }
    const { action, notes } = body

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Action harus "approve" atau "reject".' }, { status: 400 })
    }

    if (action === 'reject' && !notes?.trim()) {
      return NextResponse.json({ error: 'Alasan penolakan wajib diisi.' }, { status: 400 })
    }

    // ── 1. Verify Admin via Session Cookie ──────────────────────────────
    const supabaseUser = await createSupabaseServerClient()
    const { data: { user } } = await supabaseUser.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
    }

    const { data: adminProfile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (adminProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Akses ditolak. Hanya admin yang dapat melakukan ini.' }, { status: 403 })
    }

    // ── 2. Update Status (use service role to bypass RLS for admin action) ──
    const supabase = createSupabaseServiceClient()

    const newStatus = action === 'approve' ? 'approved' : 'rejected'

    const { data: updatedRequest, error: updateError } = await supabase
      .from('blood_requests')
      .update({
        status: newStatus,
        admin_notes: notes?.trim() ?? null,
      })
      .eq('id', requestId)
      .select('id, blood_type, rhesus, bags_needed, bags_fulfilled')
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // ── 3. If Approved → Find Matching Volunteers & Broadcast WA ─────────
    if (action === 'approve' && updatedRequest) {
      const matchingVolunteers = await findMatchingVolunteers(
        supabase,
        updatedRequest.blood_type,
        updatedRequest.rhesus
      )

      console.log(
        `[Blood-Connect] Request ${requestId} approved. ` +
        `Found ${matchingVolunteers.length} matching volunteers.`
      )

      // Trigger Edge Function asynchronously (non-blocking)
      triggerVolunteerBroadcast(requestId).catch((err) =>
        console.error('[Blood-Connect] Edge Function error:', err)
      )
    }

    return NextResponse.json({
      success: true,
      message: action === 'approve'
        ? 'Permintaan berhasil disetujui. Relawan cocok sedang dihubungi via WhatsApp.'
        : 'Permintaan berhasil ditolak.',
      status: newStatus,
    })

  } catch (err) {
    console.error('Verify route error:', err)
    return NextResponse.json(
      { error: 'Internal server error.' },
      { status: 500 }
    )
  }
}

// ============================================================
// DATA FILTERING: Volunteer Matching Query
// Kriteria:
//   1. blood_type cocok dengan request
//   2. rhesus cocok dengan request
//   3. is_active = true (tidak dalam cooldown)
//   4. last_donated_at IS NULL — belum pernah donor
//      OR last_donated_at < (today - 90 days) — sudah lewat cooldown
// ============================================================
async function findMatchingVolunteers(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  bloodType: string,
  rhesus: string
) {
  const cooldownDate = new Date()
  cooldownDate.setDate(cooldownDate.getDate() - 90)
  const cooldownDateStr = cooldownDate.toISOString().split('T')[0] // YYYY-MM-DD

  const { data, error } = await supabase
    .from('profiles')
    .select('id, name, phone_number, sub_district, last_donated_at')
    .eq('blood_type', bloodType)
    .eq('rhesus', rhesus)
    .eq('role', 'volunteer')
    .eq('is_active', true)
    // Supabase JS does not directly support `IS NULL OR < date` in one call,
    // so we use the PostgREST `or` filter:
    .or(`last_donated_at.is.null,last_donated_at.lt.${cooldownDateStr}`)

  if (error) {
    console.error('Volunteer query error:', error)
    return []
  }

  return data ?? []
}

// ============================================================
// TRIGGER EDGE FUNCTION: notify-volunteers
// Called after status is updated to 'approved'.
// ============================================================
async function triggerVolunteerBroadcast(requestId: string) {
  const edgeFunctionUrl =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-volunteers`

  const response = await fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ request_id: requestId }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Edge Function responded with ${response.status}: ${text}`)
  }

  return response.json()
}
