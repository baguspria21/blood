import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabaseServer'

/**
 * POST /api/v1/transfusion-requests
 * Public (anon) — creates a new transfusion request form submission.
 * Accepts multipart/form-data with all fields from the RSUD Tora Belo
 * "Permintaan Darah Untuk Transfusi" form.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()

    const getString = (key: string) =>
      (formData.get(key) as string | null)?.trim() || null

    const getInt = (key: string) => {
      const v = formData.get(key)
      if (!v) return null
      const n = parseInt(v as string, 10)
      return isNaN(n) || n <= 0 ? null : n
    }

    const getFloat = (key: string) => {
      const v = formData.get(key)
      if (!v) return null
      const n = parseFloat(v as string)
      return isNaN(n) ? null : n
    }

    const getBool = (key: string) => {
      const v = formData.get(key)
      if (v === null) return false
      return v === 'true' || v === '1' || v === 'yes'
    }

    // ── Required fields ───────────────────────────────────────────────────
    const patient_name  = getString('patient_name')
    const contact_phone = getString('contact_phone')
    const request_date  = getString('request_date')
    const blood_type    = getString('blood_type')
    const rhesus        = getString('rhesus')

    if (!patient_name) {
      return NextResponse.json({ error: 'Nama pasien wajib diisi.' }, { status: 400 })
    }
    if (!contact_phone) {
      return NextResponse.json({ error: 'Nomor kontak wajib diisi.' }, { status: 400 })
    }
    if (!request_date) {
      return NextResponse.json({ error: 'Tanggal permintaan wajib diisi.' }, { status: 400 })
    }

    if (blood_type && !['A', 'B', 'AB', 'O'].includes(blood_type)) {
      return NextResponse.json({ error: 'Golongan darah tidak valid.' }, { status: 400 })
    }
    if (rhesus && !['+', '-'].includes(rhesus)) {
      return NextResponse.json({ error: 'Rhesus tidak valid.' }, { status: 400 })
    }

    // ── File upload ───────────────────────────────────────────────────────
    const proof_file = formData.get('proof_file') as File | null
    let proof_url: string | null = null

    if (proof_file && proof_file.size > 0) {
      const supabaseService = createSupabaseServiceClient()
      const ext = proof_file.name.split('.').pop() ?? 'jpg'
      const fileName = `transfusion-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const buffer = Buffer.from(await proof_file.arrayBuffer())

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

    // ── Build insert payload ───────────────────────────────────────────────
    const payload = {
      // Identitas
      requesting_hospital:      getString('requesting_hospital'),
      bagian:                   getString('bagian'),
      kelas:                    getString('kelas'),
      no_reg:                   getString('no_reg'),
      requesting_doctor:        getString('requesting_doctor'),

      // Data pasien
      patient_name,
      spouse_name:              getString('spouse_name'),
      birth_date:               getString('birth_date'),
      age_years:                getInt('age_years'),
      age_months:               getInt('age_months'),
      address:                  getString('address'),
      contact_phone,
      request_date,
      needed_date:              getString('needed_date'),

      // Klinis
      diagnosis:                getString('diagnosis'),
      transfusion_reason:       getString('transfusion_reason'),
      hemoglobin:               getFloat('hemoglobin'),
      has_previous_transfusion: getBool('has_previous_transfusion'),
      had_reaction:             getBool('had_reaction'),
      reaction_date:            getString('reaction_date'),
      symptoms_1:               getString('symptoms_1'),
      symptoms_2:               getString('symptoms_2'),

      // Coombs
      coombs_test:              getBool('coombs_test'),
      coombs_date:              getString('coombs_date'),
      coombs_result:            getString('coombs_result'),

      // Khusus wanita
      pregnancy_count:          getInt('pregnancy_count'),
      abortion_count:           getInt('abortion_count'),
      hemolytic_disease:        getBool('hemolytic_disease'),

      // Whole Blood
      wb_fresh_volume:          getInt('wb_fresh_volume'),
      wb_new_volume:            getInt('wb_new_volume'),
      wb_regular_volume:        getInt('wb_regular_volume'),

      // PRC
      prc_fresh_volume:         getInt('prc_fresh_volume'),
      prc_regular_volume:       getInt('prc_regular_volume'),
      prc_washed_volume:        getInt('prc_washed_volume'),

      // Plasma
      plasma_regular_volume:    getInt('plasma_regular_volume'),
      plasma_ffp_volume:        getInt('plasma_ffp_volume'),

      // Faktor pembekuan
      factor_thrombocyte_bags:      getInt('factor_thrombocyte_bags'),
      factor_cryoprecipitate_bags:  getInt('factor_cryoprecipitate_bags'),
      factor_buffycoat_bags:        getInt('factor_buffycoat_bags'),
      factor_other:                 getString('factor_other'),

      // Golongan darah & rhesus
      blood_type:               blood_type as 'A' | 'B' | 'AB' | 'O' | null,
      rhesus:                   rhesus as '+' | '-' | null,

      // Lain-lain
      hospital_id:              getString('hospital_id'),
      proof_url,
      status:                   'pending' as const,
    }

    // ── Insert ────────────────────────────────────────────────────────────
    const supabase = await createSupabaseServerClient()
    const { data: record, error: insertError } = await supabase
      .from('transfusion_requests')
      .insert(payload)
      .select('id, patient_name, blood_type, rhesus, status, created_at')
      .single()

    if (insertError) {
      console.error('[Blood-Connect] Transfusion request insert error:', insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Surat permintaan transfusi berhasil dikirim. Admin akan memverifikasi segera.',
        request: record,
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[Blood-Connect] POST /api/v1/transfusion-requests error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
