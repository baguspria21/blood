import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServer'

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
    const supabase = await createSupabaseServerClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the donation belongs to this volunteer and is in 'approved' status
    const { data: donation, error: fetchErr } = await supabase
      .from('volunteer_donations')
      .select('id, volunteer_id, status, blood_type, rhesus')
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

    // Parse the multipart form
    const formData = await req.formData()
    const file = formData.get('proof') as File | null

    if (!file || file.size === 0) {
      return NextResponse.json(
        { error: 'File bukti donor tidak ditemukan. Pilih file terlebih dahulu.' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.' },
        { status: 400 }
      )
    }

    // Validate file size (5 MB max)
    const MAX_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'Ukuran file terlalu besar. Maksimal 5 MB.' },
        { status: 400 }
      )
    }

    // Build storage path: donation-proofs/{donationId}/{timestamp}.{ext}
    const ext = file.name.split('.').pop() ?? 'jpg'
    const filePath = `${donationId}/${Date.now()}.${ext}`

    // Convert File to ArrayBuffer → Uint8Array for Supabase upload
    const arrayBuffer = await file.arrayBuffer()
    const fileBuffer = new Uint8Array(arrayBuffer)

    const { error: uploadErr } = await supabase.storage
      .from('donation-proofs')
      .upload(filePath, fileBuffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadErr) {
      console.error('[upload-proof] storage upload error:', uploadErr)
      return NextResponse.json(
        { error: 'Gagal mengunggah file. Coba lagi.' },
        { status: 500 }
      )
    }

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from('donation-proofs')
      .getPublicUrl(filePath)

    // Save proof_url to the donation record
    const { data: updated, error: updateErr } = await supabase
      .from('volunteer_donations')
      .update({ proof_url: publicUrl })
      .eq('id', donationId)
      .select('id, status, proof_url')
      .single()

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
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
