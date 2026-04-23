'use server'

import { createSupabaseServerClient } from '@/lib/supabaseServer'
import { revalidatePath } from 'next/cache'

/**
 * Checks if there's a potential duplicate request:
 * Same hospital, same blood type, created within the last 24 hours.
 */
export async function checkDuplicateRequest(
  currentRequestId: string,
  hospitalId: string,
  bloodType: string,
  rhesus: string
) {
  const supabase = await createSupabaseServerClient()

  // Calculate the timestamp 24 hours ago
  const yesterday = new Date()
  yesterday.setHours(yesterday.getHours() - 24)

  const { data, error } = await supabase
    .from('blood_requests')
    .select('id, patient_name, created_at, status')
    .eq('hospital_id', hospitalId)
    .eq('blood_type', bloodType)
    .eq('rhesus', rhesus)
    .gte('created_at', yesterday.toISOString())
    .neq('id', currentRequestId) // Exclude current

  if (error || !data) return { hasDuplicate: false, duplicates: [] }

  return {
    hasDuplicate: data.length > 0,
    duplicates: data
  }
}

/**
 * Finalizes the verification, updates status to approved,
 * applies priority, saves donation schedule, and blasts the WhatsApp job payload.
 */
export async function approveAndBlastRequest(
  requestId: string,
  priority: 'cito' | 'regular',
  adminNotes: string,
  donationSchedule: { date: string; time: string }
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // Build TIMESTAMPTZ string from date + time (local WIB = +08:00)
  const scheduleISO = `${donationSchedule.date}T${donationSchedule.time}:00+08:00`

  // 1. Update the database (status + schedule)
  const { error } = await supabase
    .from('blood_requests')
    .update({
      status: 'approved',
      priority: priority,
      admin_notes: adminNotes || null,
      donation_schedule: scheduleISO,
    })
    .eq('id', requestId)

  if (error) {
    return { success: false, error: error.message }
  }

  // 2. Build the structured WhatsApp job payload (Redis-style job object)
  const jobPayload = {
    job: 'whatsapp_blast',
    request_id: requestId,
    priority,
    donation_schedule: scheduleISO,
    admin_notes: adminNotes || null,
    queued_at: new Date().toISOString(),
  }

  console.log('[Blood-Connect] WhatsApp Job Queued:', JSON.stringify(jobPayload, null, 2))

  // 3. Trigger Edge Function with full job payload (non-blocking)
  const edgeFunctionUrl =
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-volunteers`

  fetch(edgeFunctionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify(jobPayload),
  }).catch((err) =>
    console.error('[Blood-Connect] Edge Function error:', err)
  )

  revalidatePath('/admin/permintaan')
  revalidatePath('/admin')

  return { success: true }
}
