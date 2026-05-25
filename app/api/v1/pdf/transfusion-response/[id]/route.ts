import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { TransfusionUnifiedPDF } from '@/lib/pdf/TransfusionUnifiedPDF'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/pdf/transfusion-response/[id]
 *
 * Admin-only endpoint that generates the same unified "living document"
 * as the hospital endpoint — because both parties should see an identical PDF.
 *
 * - Admin accesses this from the detail page to get the release note with
 *   the blood bag logbook and the receiver's digital signature rendered
 *   from the base64 data captured in the signature canvas.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Admin-only guard
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  // Fetch request + responses in parallel
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
  const filename = `release_note_${slug}_${id.slice(0, 8)}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
