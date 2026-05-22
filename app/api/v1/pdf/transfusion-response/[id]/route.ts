import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { TransfusionResponsePDF } from '@/lib/pdf/TransfusionResponsePDF'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/pdf/transfusion-response/[id]
 * Generates a PDF "Surat Pengeluaran Darah" for a given transfusion_request ID.
 * Includes all transfusion_responses (blood bags) and the receiver signature.
 * Admin-only.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  // Fetch request + responses in parallel
  const [{ data: request }, { data: responses }] = await Promise.all([
    supabase.from('transfusion_requests').select('*').eq('id', id).single(),
    supabase.from('transfusion_responses').select('*').eq('transfusion_request_id', id).order('created_at'),
  ])

  if (!request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const buffer = await renderToBuffer(
    React.createElement(TransfusionResponsePDF, {
      request,
      responses: responses ?? [],
    }) as React.ReactElement<DocumentProps>
  )

  const patientSlug = (request.patient_name ?? 'pasien').replace(/\s+/g, '_').toLowerCase()
  const filename = `surat_pengeluaran_darah_${patientSlug}_${id.slice(0, 8)}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
