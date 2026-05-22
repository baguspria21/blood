import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServiceClient } from '@/lib/supabaseServer'

/**
 * POST /api/v1/auth/set-hospital-role
 * Called immediately after hospital signup to override the default 'volunteer' role.
 * Uses service role to bypass RLS.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

    const supabase = createSupabaseServiceClient()

    // Wait a moment for the trigger to create the profile first
    await new Promise(r => setTimeout(r, 800))

    const { error } = await supabase
      .from('profiles')
      .update({ role: 'hospital' })
      .eq('id', userId)

    if (error) {
      console.error('[set-hospital-role] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[set-hospital-role] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
