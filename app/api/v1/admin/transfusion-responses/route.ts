import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * POST /api/v1/admin/transfusion-responses
 * Create one or more blood bag response records in a single request.
 *
 * Body shape:
 * {
 *   transfusion_request_id: string
 *   blood_type_abo:  string | null   // shared across all bags
 *   rhesus:          string | null   // shared across all bags
 *   officer_name:    string | null   // shared
 *   release_date:    string | null   // shared
 *   release_time:    string | null   // shared
 *   receiver_name:   string | null   // shared
 *   receiver_signature: string | null
 *   officer_signature:  string | null
 *   bags: {
 *     bag_number:      string   (required)
 *     blood_category:  string | null
 *     volume_cc:       string | null
 *     collection_date: string | null
 *   }[]
 * }
 *
 * Returns:
 *   { success: true, responses: TransfusionResponse[] }
 *
 * PATCH /api/v1/admin/transfusion-responses
 * Update the status of the parent transfusion_request (e.g. mark as completed/rejected).
 */

async function requireAdmin(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const user = await requireAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 })
  }

  try {
    const body = await req.json()

    const {
      transfusion_request_id,
      blood_type_abo,
      rhesus,
      officer_name,
      release_date,
      release_time,
      receiver_name,
      receiver_signature,
      officer_signature,
      bags,
    } = body

    // ── Validation ──────────────────────────────────────────────────────────
    if (!transfusion_request_id) {
      return NextResponse.json({ error: 'transfusion_request_id required.' }, { status: 400 })
    }

    // Accept both legacy single-bag body and new bags[] shape
    const bagList: { bag_number: string; blood_category?: string | null; volume_cc?: string | null; collection_date?: string | null }[] =
      Array.isArray(bags) && bags.length > 0
        ? bags
        // Legacy: single-bag fields on the root body
        : [{ bag_number: body.bag_number, blood_category: body.blood_category, volume_cc: body.volume_cc, collection_date: body.collection_date }]

    if (bagList.length === 0) {
      return NextResponse.json({ error: 'Minimal satu kantong darah wajib diisi.' }, { status: 400 })
    }

    // Validate all bag numbers
    for (let i = 0; i < bagList.length; i++) {
      if (!bagList[i].bag_number?.trim()) {
        return NextResponse.json({ error: `Nomor kantong #${i + 1} wajib diisi.` }, { status: 400 })
      }
    }

    // ── Build insert rows ───────────────────────────────────────────────────
    const rows = bagList.map(bag => ({
      transfusion_request_id,
      bag_number:         bag.bag_number.trim(),
      collection_date:    bag.collection_date    || null,
      blood_category:     bag.blood_category     || null,
      volume_cc:          bag.volume_cc          || null,
      // Shared fields
      blood_type_abo:     blood_type_abo         || null,
      rhesus:             rhesus                 || null,
      officer_name:       officer_name           || null,
      release_date:       release_date           || null,
      release_time:       release_time           || null,
      receiver_name:      receiver_name          || null,
      receiver_signature: receiver_signature     || null,
      officer_signature:  officer_signature      || null,
    }))

    // ── Bulk insert ─────────────────────────────────────────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from('transfusion_responses')
      .insert(rows)
      .select('*')

    if (insertError) {
      console.error('[transfusion-responses] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // ── Auto-update parent request status to 'approved' if still pending ────
    await supabase
      .from('transfusion_requests')
      .update({ status: 'approved' })
      .eq('id', transfusion_request_id)
      .eq('status', 'pending')

    return NextResponse.json({ success: true, responses: inserted ?? [] }, { status: 201 })
  } catch (err) {
    console.error('[transfusion-responses] POST error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const user = await requireAdmin(supabase)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized. Admin access required.' }, { status: 401 })
  }

  try {
    const { transfusion_request_id, status, rejection_notes, officer_name, officer_signature } = await req.json()
    if (!transfusion_request_id || !status) {
      return NextResponse.json({ error: 'transfusion_request_id and status required.' }, { status: 400 })
    }

    const validStatuses = ['pending', 'approved', 'completed', 'rejected']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status.' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = { status }
    if (rejection_notes !== undefined) {
      updatePayload.rejection_notes = rejection_notes
    }

    const { error } = await supabase
      .from('transfusion_requests')
      .update(updatePayload)
      .eq('id', transfusion_request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // If rejecting with an officer signature, store it as a minimal response row
    // so the PDF can display the officer's accountability signature.
    if (status === 'rejected' && officer_signature) {
      await supabase.from('transfusion_responses').insert({
        transfusion_request_id,
        bag_number:        'REJECTED',
        officer_name:      officer_name || null,
        officer_signature: officer_signature,
        release_date:      new Date().toISOString().split('T')[0],
        release_time:      new Date().toTimeString().slice(0, 5),
      })
    }

    return NextResponse.json({ success: true, status })
  } catch (err) {
    console.error('[transfusion-responses] PATCH error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createSupabaseServerClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const requestId = searchParams.get('request_id')
  if (!requestId) return NextResponse.json({ error: 'request_id required.' }, { status: 400 })

  const { data, error } = await supabase
    .from('transfusion_responses')
    .select('*')
    .eq('transfusion_request_id', requestId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ responses: data })
}
