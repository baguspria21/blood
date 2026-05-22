import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * POST /api/v1/admin/transfusion-responses
 * Create a new blood bag response record (admin only).
 *
 * PATCH /api/v1/admin/transfusion-responses
 * Update the status of the parent transfusion_request (e.g. mark as completed).
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
      bag_number,
      collection_date,
      blood_category,
      volume_cc,
      blood_type_abo,
      rhesus,
      officer_name,
      release_date,
      release_time,
      receiver_name,
      receiver_signature,
    } = body

    if (!transfusion_request_id) {
      return NextResponse.json({ error: 'transfusion_request_id required.' }, { status: 400 })
    }
    if (!bag_number?.trim()) {
      return NextResponse.json({ error: 'Nomor kantong wajib diisi.' }, { status: 400 })
    }

    // Insert response row
    const { data: response, error: insertError } = await supabase
      .from('transfusion_responses')
      .insert({
        transfusion_request_id,
        bag_number:           bag_number.trim(),
        collection_date:      collection_date || null,
        blood_category:       blood_category || null,
        volume_cc:            volume_cc || null,
        blood_type_abo:       blood_type_abo || null,
        rhesus:               rhesus || null,
        officer_name:         officer_name || null,
        release_date:         release_date || null,
        release_time:         release_time || null,
        receiver_name:        receiver_name || null,
        receiver_signature:   receiver_signature || null,
      })
      .select('*')
      .single()

    if (insertError) {
      console.error('[transfusion-responses] insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Auto-update parent request status to 'approved' if still pending
    await supabase
      .from('transfusion_requests')
      .update({ status: 'approved' })
      .eq('id', transfusion_request_id)
      .eq('status', 'pending')

    return NextResponse.json({ success: true, response }, { status: 201 })
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
    const { transfusion_request_id, status, rejection_notes } = await req.json()
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
