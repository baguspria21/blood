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
 * applies priority, and "blasts" the message (conceptually).
 */
export async function approveAndBlastRequest(
  requestId: string,
  priority: 'cito' | 'regular',
  adminNotes: string
) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }

  // 1. Update the database
  const { error } = await supabase
    .from('blood_requests')
    .update({
      status: 'approved',
      priority: priority,
      admin_notes: adminNotes || null
    })
    .eq('id', requestId)

  if (error) {
    return { success: false, error: error.message }
  }

  // NOTE: If using the existing Edge Function trigger for WhatsApp,
  // it might fire automatically on `status = approved`.
  // The trigger might need to be verified to support 'priority'.

  revalidatePath('/admin/permintaan')
  revalidatePath('/admin')

  return { success: true }
}
