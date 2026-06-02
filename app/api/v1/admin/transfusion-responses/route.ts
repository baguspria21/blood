import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

/**
 * POST /api/v1/admin/transfusion-responses
 * ──────────────────────────────────────────────────────────────────────────────
 * Accepts a unified `products[]` payload that supports partial fulfillment:
 * each product can be independently marked as "tersedia" (available, with bag
 * data) or "tidak_tersedia" (unavailable, with optional notes).
 *
 * Body:
 * {
 *   transfusion_request_id: string
 *   blood_type_abo:         string | null   // shared across all bags
 *   rhesus:                 string | null   // shared
 *   officer_name:           string | null   // shared
 *   release_date:           string | null   // shared
 *   release_time:           string | null   // shared
 *   receiver_name:          string | null   // shared
 *   receiver_signature:     string | null
 *   officer_signature:      string | null
 *   products: {
 *     label:  string                    // blood_category stored in DB
 *     status: 'tersedia' | 'tidak_tersedia'
 *     bags:   { bag_number, volume_cc?, collection_date? }[]   // when tersedia
 *     notes:  string                    // when tidak_tersedia (stored in rejection_notes)
 *   }[]
 * }
 *
 * Server logic:
 *   - Bulk-insert one DB row per bag for every product with status "tersedia"
 *   - Aggregate unavailable product notes → stored in transfusion_requests.rejection_notes
 *   - If at least one product is available  → request status = "approved"
 *   - If all products are unavailable        → request status = "rejected"
 *     (+ insert a synthetic "REJECTED" row to store the officer accountability sig)
 *
 * Returns:
 *   { success: true, responses: TransfusionResponse[], newStatus: string }
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * PATCH /api/v1/admin/transfusion-responses
 * Update the status of the parent transfusion_request (mark completed / rejected).
 * ──────────────────────────────────────────────────────────────────────────────
 * GET  /api/v1/admin/transfusion-responses?request_id=<uuid>
 * Fetch all response rows for a given request.
 */

// ── Auth helper ────────────────────────────────────────────────────────────────
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

// ── Types (internal) ──────────────────────────────────────────────────────────
interface ProductPayload {
  label:  string
  status: 'tersedia' | 'tidak_tersedia'
  bags:   { bag_number: string; volume_cc?: string | null; collection_date?: string | null }[]
  notes:  string
}

// ═════════════════════════════════════════════════════════════════════════════
// POST — unified partial-fulfillment endpoint
// ═════════════════════════════════════════════════════════════════════════════
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
      estimated_pickup_time,
    } = body

    if (!transfusion_request_id) {
      return NextResponse.json({ error: 'transfusion_request_id required.' }, { status: 400 })
    }

    // ── Normalise incoming product list ──────────────────────────────────────
    // New format: products[]
    // Legacy fallback: flat bags[] array (treated as a single tersedia product)
    let products: ProductPayload[]

    if (Array.isArray(body.products) && body.products.length > 0) {
      products = body.products as ProductPayload[]
    } else if (Array.isArray(body.bags) && body.bags.length > 0) {
      // Legacy bags[] — wrap into a single "tersedia" product entry
      products = [{
        label:  body.blood_category ?? 'Darah',
        status: 'tersedia',
        bags:   body.bags as ProductPayload['bags'],
        notes:  '',
      }]
    } else {
      // Very legacy: single flat bag fields on root body
      const { bag_number, blood_category, volume_cc, collection_date } = body
      if (!bag_number?.trim()) {
        return NextResponse.json({ error: 'Minimal satu kantong atau produk wajib diisi.' }, { status: 400 })
      }
      products = [{
        label:  blood_category ?? 'Darah',
        status: 'tersedia',
        bags:   [{ bag_number, volume_cc, collection_date }],
        notes:  '',
      }]
    }

    // ── Validate ─────────────────────────────────────────────────────────────
    for (let i = 0; i < products.length; i++) {
      const p = products[i]
      if (p.status === 'tersedia') {
        if (!p.bags || p.bags.length === 0) {
          return NextResponse.json({ error: `Minimal satu kantong wajib diisi untuk produk "${p.label}".` }, { status: 400 })
        }
        for (let j = 0; j < p.bags.length; j++) {
          if (!p.bags[j].bag_number?.trim()) {
            return NextResponse.json(
              { error: `Nomor kantong #${j + 1} untuk "${p.label}" wajib diisi.` },
              { status: 400 },
            )
          }
        }
      }
    }

    // ── Split available vs unavailable ───────────────────────────────────────
    const available   = products.filter(p => p.status === 'tersedia')
    const unavailable = products.filter(p => p.status === 'tidak_tersedia')

    // ── Build bag rows for bulk insert ───────────────────────────────────────
    const rows = available.flatMap(product =>
      product.bags.map(bag => ({
        transfusion_request_id,
        bag_number:         bag.bag_number.trim(),
        blood_category:     product.label,
        collection_date:    bag.collection_date   || null,
        volume_cc:          bag.volume_cc          || null,
        // Shared officer / receiver fields
        blood_type_abo:     blood_type_abo         || null,
        rhesus:             rhesus                 || null,
        officer_name:       officer_name           || null,
        release_date:       release_date           || null,
        release_time:       release_time           || null,
        receiver_name:      receiver_name          || null,
        receiver_signature: receiver_signature     || null,
        officer_signature:  officer_signature      || null,
      })),
    )

    // ── Determine new request status ─────────────────────────────────────────
    const newStatus: 'approved' | 'rejected' = available.length > 0 ? 'approved' : 'rejected'

    // ── Build rejection notes for unavailable products ───────────────────────
    // e.g. "Tidak tersedia: WB Biasa (Stok habis), FFP"
    let rejectionNotes: string | null = null
    if (unavailable.length > 0) {
      rejectionNotes = 'Tidak tersedia: ' + unavailable
        .map(p => p.notes ? `${p.label} (${p.notes})` : p.label)
        .join(', ')
    }

    // ── Insert bag rows ───────────────────────────────────────────────────────
    let insertedRows: Record<string, unknown>[] = []

    if (rows.length > 0) {
      const { data, error: insertError } = await supabase
        .from('transfusion_responses')
        .insert(rows)
        .select('*')

      if (insertError) {
        console.error('[transfusion-responses] bulk insert error:', insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
      insertedRows = data ?? []
    }

    // ── If full rejection: insert accountability row for officer sig ──────────
    if (newStatus === 'rejected' && officer_signature) {
      await supabase.from('transfusion_responses').insert({
        transfusion_request_id,
        bag_number:        'REJECTED',
        officer_name:      officer_name      || null,
        officer_signature: officer_signature,
        release_date:      new Date().toISOString().split('T')[0],
        release_time:      new Date().toTimeString().slice(0, 5),
      })
    }

    // ── Update parent request ─────────────────────────────────────────────────
    const requestUpdate: Record<string, unknown> = { status: newStatus }
    if (rejectionNotes !== null) requestUpdate.rejection_notes = rejectionNotes
    // Store estimated pickup time (DIPROSES stage)
    if (estimated_pickup_time && newStatus === 'approved') {
      requestUpdate.estimated_pickup_time = estimated_pickup_time
    }

    await supabase
      .from('transfusion_requests')
      .update(requestUpdate)
      .eq('id', transfusion_request_id)

    return NextResponse.json(
      { success: true, responses: insertedRows, newStatus },
      { status: 201 },
    )
  } catch (err) {
    console.error('[transfusion-responses] POST error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// PATCH — status update (mark completed, or quick-reject with officer sig)
// ═════════════════════════════════════════════════════════════════════════════
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
    if (rejection_notes !== undefined) updatePayload.rejection_notes = rejection_notes

    const { error } = await supabase
      .from('transfusion_requests')
      .update(updatePayload)
      .eq('id', transfusion_request_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Store officer accountability row when rejecting via PATCH
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

// ═════════════════════════════════════════════════════════════════════════════
// GET — fetch all response rows for a request
// ═════════════════════════════════════════════════════════════════════════════
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
