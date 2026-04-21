'use server'

import { createClient } from '@supabase/supabase-js'

interface SeedResult {
  success: boolean
  message: string
  userId?: string
}

/**
 * Server Action — SEED a volunteer account.
 * Uses the service role key to bypass RLS.
 * Safe to call from a Server Component or a form action.
 *
 * Usage (e.g., from a one-time /admin/seed page):
 *   import { seedVolunteerUser } from '@/app/actions/seed-user'
 *   const result = await seedVolunteerUser()
 */
export async function seedVolunteerUser(): Promise<SeedResult> {
  // Admin client — never exposed to the browser
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const EMAIL    = 'bagustpu@gmail.com'
  const PASSWORD = 'Volunteer123!'

  // ── Step 1: Create the user in Supabase Auth ───────────────────────────
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email:          EMAIL,
    password:       PASSWORD,
    email_confirm:  true,          // Skip email verification
    user_metadata:  {
      name:         'Bagus Volunteer',
      phone_number: '081000000001',
      blood_type:   'O',
      rhesus:       '+',
      sub_district: 'Palu Barat',
    },
  })

  if (authError) {
    // Handle "already exists" gracefully
    if (authError.message.includes('already been registered') ||
        authError.message.includes('already registered')) {
      return { success: false, message: `Akun ${EMAIL} sudah ada di Supabase Auth.` }
    }
    return { success: false, message: `Auth error: ${authError.message}` }
  }

  if (!authData.user) {
    return { success: false, message: 'Gagal membuat user — tidak ada data yang dikembalikan.' }
  }

  const userId = authData.user.id

  // ── Step 2: Insert into public.profiles ────────────────────────────────
  // The trigger `handle_new_user` should do this automatically,
  // but we upsert here as a guarantee (ON CONFLICT → update nothing).
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      {
        id:           userId,
        name:         'Bagus Volunteer',
        phone_number: '081000000001',
        blood_type:   'O',
        rhesus:       '+',
        sub_district: 'Palu Barat',
        role:         'volunteer',
        is_active:    true,
      },
      { onConflict: 'id' }
    )

  if (profileError) {
    return {
      success: false,
      message: `User dibuat (${userId}) tapi profil gagal: ${profileError.message}`,
      userId,
    }
  }

  return {
    success: true,
    message: `✅ Akun volunteer berhasil dibuat!\nEmail: ${EMAIL}\nPassword: ${PASSWORD}\nUser ID: ${userId}`,
    userId,
  }
}
