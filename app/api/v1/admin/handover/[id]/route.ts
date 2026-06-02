import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * POST /api/v1/admin/handover/[id]
 * ──────────────────────────────────────────────────────────────────────────────
 * SELESAI stage handover endpoint.
 * Called when the blood is physically picked up by the receiver.
 *
 * Body:
 * {
 *   receiver_name:      string | null
 *   receiver_signature: string | null   // base64 PNG from canvas
 * }
 *
 * Server logic:
 *   - Verifies request exists and status is 'approved' (DIPROSES)
 *   - Updates all transfusion_responses rows for this request with
 *     receiver_name and receiver_signature
 *   - Sets transfusion_requests.status = 'completed'
 *
 * Returns:
 *   { success: true }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: transfusion_request_id } = await params

  const supabase = await createSupabaseServerClient()

  // Auth: admin only
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  try {
    const { receiver_name, receiver_signature } = await req.json()

    if (!transfusion_request_id) {
      return NextResponse.json({ error: 'Request ID required.' }, { status: 400 })
    }

    // Verify the request is in DIPROSES (approved) state
    const { data: request, error: fetchErr } = await supabase
      .from('transfusion_requests')
      .select('id, status')
      .eq('id', transfusion_request_id)
      .single()

    if (fetchErr || !request) {
      return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 })
    }

    if (request.status !== 'approved') {
      return NextResponse.json(
        { error: `Permintaan tidak dapat diselesaikan dari status: ${request.status}.` },
        { status: 409 }
      )
    }

    // Update all response rows with receiver info (skip REJECTED accountability rows)
    const updatePayload: Record<string, unknown> = {}
    if (receiver_name) updatePayload.receiver_name = receiver_name
    if (receiver_signature) updatePayload.receiver_signature = receiver_signature

    if (Object.keys(updatePayload).length > 0) {
      await supabase
        .from('transfusion_responses')
        .update(updatePayload)
        .eq('transfusion_request_id', transfusion_request_id)
        .neq('bag_number', 'REJECTED')
    }

    // Transition request status to SELESAI (completed)
    const { error: updateErr } = await supabase
      .from('transfusion_requests')
      .update({ status: 'completed' })
      .eq('id', transfusion_request_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[handover] POST error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
