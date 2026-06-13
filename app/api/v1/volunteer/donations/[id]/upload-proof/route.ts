import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabaseServer'

/**
 * POST /api/v1/volunteer/donations/[id]/upload-proof
 *
 * Accepts multipart/form-data with a single file field named "proof".
 * Uploads the file to the 'donation-proofs' Supabase Storage bucket,
 * saves the public URL to volunteer_donations.proof_url,
 * and returns the updated donation record.
 *
 * Rules:
 *   - Only the volunteer who owns the session can upload
 *   - Session must be in 'approved' status
 *   - File must be an image (jpeg/png/webp) or PDF, max 5 MB
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: donationId } = await params

    // ── 1. Auth check (anon client — reads cookies) ──────────────
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Verify the donation belongs to this volunteer ──────────
    const { data: donation, error: fetchErr } = await supabase
      .from('volunteer_donations')
      .select('id, volunteer_id, status')
      .eq('id', donationId)
      .eq('volunteer_id', user.id)
      .single()

    if (fetchErr || !donation) {
      return NextResponse.json(
        { error: 'Sesi donasi tidak ditemukan atau bukan milik Anda.' },
        { status: 404 }
      )
    }

    if (donation.status !== 'approved') {
      return NextResponse.json(
        { error: 'Bukti donor hanya bisa diunggah untuk sesi yang sudah disetujui admin.' },
        { status: 400 }
      )
    }

    // ── 3. Parse multipart form ───────────────────────────────────
    let formData: FormData
    try {
      formData = await req.formData()
    } catch (e) {
      console.error('[upload-proof] formData parse error:', e)
      return NextResponse.json(
        { error: 'Gagal membaca file. Pastikan form menggunakan enctype multipart/form-data.' },
        { status: 400 }
      )
    }

    const file = formData.get('proof') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'File bukti donor tidak ditemukan. Pilih file terlebih dahulu.' },
        { status: 400 }
      )
    }

    // ── 4. Validate type & size ───────────────────────────────────
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.' },
        { status: 400 }
      )
    }

    const MAX_SIZE = 5 * 1024 * 1024 // 5 MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5 MB.' },
        { status: 400 }
      )
    }

    // ── 5. Upload to Storage (service role — bypasses RLS safely) ─
    //    We already verified ownership above, so service role is fine here.
    const serviceClient = createSupabaseServiceClient()

    const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
    const filePath = `${donationId}/${Date.now()}.${ext}`

    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { error: uploadErr } = await serviceClient.storage
      .from('donation-proofs')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[upload-proof] storage upload error:', JSON.stringify(uploadErr))
      return NextResponse.json(
        { error: `Gagal mengunggah file: ${uploadErr.message}` },
        { status: 500 }
      )
    }

    // ── 6. Get public URL ─────────────────────────────────────────
    const { data: { publicUrl } } = serviceClient.storage
      .from('donation-proofs')
      .getPublicUrl(filePath)

    // ── 7. Save proof_url to DB (service role to avoid column-missing RLS issues) ──
    const { data: updated, error: updateErr } = await serviceClient
      .from('volunteer_donations')
      .update({ proof_url: publicUrl })
      .eq('id', donationId)
      .select('id, status, proof_url')
      .single()

    if (updateErr) {
      console.error('[upload-proof] db update error:', JSON.stringify(updateErr))
      return NextResponse.json(
        { error: `Gagal menyimpan bukti: ${updateErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Bukti donor berhasil diunggah! Admin akan memverifikasi dan menyelesaikan sesi Anda.',
      donation: updated,
    })
  } catch (err) {
    console.error('[upload-proof] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
