import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { renderToBuffer } from '@react-pdf/renderer'
import type { DocumentProps } from '@react-pdf/renderer'
import React from 'react'
import { TransfusionRequestPDF } from '@/lib/pdf/TransfusionRequestPDF'

export const dynamic = 'force-dynamic'

/**
 * GET /api/v1/pdf/transfusion-request/[id]
 * Generates and streams a PDF "Surat Permintaan Transfusi" for the given request.
 * Accessible by the hospital that owns the request OR by admins.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch the request
  const { data: request, error } = await supabase
    .from('transfusion_requests')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !request) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Generate PDF buffer
  const buffer = await renderToBuffer(
    React.createElement(TransfusionRequestPDF, { request }) as React.ReactElement<DocumentProps>
  )

  const patientSlug = (request.patient_name ?? 'pasien').replace(/\s+/g, '_').toLowerCase()
  const filename = `permintaan_transfusi_${patientSlug}_${id.slice(0, 8)}.pdf`

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
