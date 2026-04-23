import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'

/**
 * POST /api/v1/requests
 * Public (anon) — creates a new blood request with status 'pending'.
 * Accepts multipart/form-data:
 *   - patient_name: string
 *   - contact_phone: string
 *   - hospital_id: string (UUID)
 *   - blood_type: 'A' | 'B' | 'AB' | 'O'
 *   - rhesus: '+' | '-'
 *   - bags_needed: number
 *   - proof_file: File (optional, image or PDF)
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const patient_name  = (formData.get('patient_name') as string | null)?.trim()
    const contact_phone = (formData.get('contact_phone') as string | null)?.trim()
    const hospital_id   = (formData.get('hospital_id') as string | null)?.trim()
    const blood_type    = (formData.get('blood_type') as string | null)?.trim()
    const rhesus        = (formData.get('rhesus') as string | null)?.trim()
    const bags_needed   = parseInt((formData.get('bags_needed') as string) ?? '0', 10)
    const proof_file    = formData.get('proof_file') as File | null

    // ── Validation ──────────────────────────────────────────────────────────
    if (!patient_name || !contact_phone || !hospital_id || !blood_type || !rhesus) {
      return NextResponse.json(
        { error: 'Semua field wajib diisi.' },
        { status: 400 }
      )
    }

    if (!['A', 'B', 'AB', 'O'].includes(blood_type)) {
      return NextResponse.json({ error: 'Golongan darah tidak valid.' }, { status: 400 })
    }

    if (!['+', '-'].includes(rhesus)) {
      return NextResponse.json({ error: 'Rhesus tidak valid.' }, { status: 400 })
    }

    if (isNaN(bags_needed) || bags_needed < 1) {
      return NextResponse.json({ error: 'Jumlah kantong minimal 1.' }, { status: 400 })
    }

    // ── Upload Proof to Supabase Storage ────────────────────────────────────
    let proof_url: string | null = null

    if (proof_file && proof_file.size > 0) {
      const supabaseService = createSupabaseServiceClient()
      const ext = proof_file.name.split('.').pop() ?? 'jpg'
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const arrayBuffer = await proof_file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabaseService.storage
        .from('proofs')
        .upload(fileName, buffer, {
          contentType: proof_file.type || 'application/octet-stream',
          upsert: false,
        })

      if (uploadError) {
        console.error('[Blood-Connect] Storage upload error:', uploadError)
        return NextResponse.json(
          { error: `Gagal mengupload bukti: ${uploadError.message}` },
          { status: 500 }
        )
      }

      const { data: urlData } = supabaseService.storage
        .from('proofs')
        .getPublicUrl(fileName)

      proof_url = urlData.publicUrl
    }

    // ── Insert Blood Request ─────────────────────────────────────────────────
    // Uses server client (respects RLS — public insert policy allows this)
    const supabase = await createSupabaseServerClient()

    const { data: request, error: insertError } = await supabase
      .from('blood_requests')
      .insert({
        patient_name,
        contact_phone,
        hospital_id,
        blood_type,
        rhesus,
        bags_needed,
        bags_fulfilled: 0,
        proof_url,
        status: 'pending',
      })
      .select('id, patient_name, blood_type, rhesus, bags_needed, status, created_at')
      .single()

    if (insertError) {
      console.error('[Blood-Connect] Insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Permintaan darah berhasil dikirim. Admin akan memverifikasi dalam waktu singkat.',
        request,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Blood-Connect] POST /api/v1/requests error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
