import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { TransfusionUnifiedPDF } from '@/lib/pdf/TransfusionUnifiedPDF'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/pdf/transfusion-request/[id]
 *
 * "Living Document" endpoint accessible by the Hospital that owns the request.
 *
 * - Status pending   → "Blood Requisition Form"   (request details only)
 * - Status approved/completed → "Blood Transfusion Release Note"
 *   (request + response bags + digital signature)
 * - Status rejected  → "Blood Unavailability Notice"
 *
 * Both Hospital and Admin see the identical document rendered from the same
 * unified template — the status drives what sections are shown.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch request + all responses in parallel
  const [{ data: request, error: reqErr }, { data: responses }] = await Promise.all([
    supabase.from('transfusion_requests').select('*').eq('id', id).single(),
    supabase.from('transfusion_responses').select('*').eq('transfusion_request_id', id).order('created_at'),
  ])

  if (reqErr || !request) {
    return NextResponse.json({ error: 'Permintaan tidak ditemukan.' }, { status: 404 })
  }

  const buffer = await renderToBuffer(
    React.createElement(TransfusionUnifiedPDF, {
      request,
      responses: responses ?? [],
    }) as React.ReactElement<DocumentProps>
  )

  const slug = (request.patient_name ?? 'pasien').replace(/\s+/g, '_').toLowerCase()
  const filename = `transfusi_${slug}_${id.slice(0, 8)}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
