import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/**
 * Browser-side Supabase client using @supabase/ssr.
 *
 * CRITICAL: We use createBrowserClient (not createClient) so that
 * auth tokens are stored in **cookies** instead of only localStorage.
 * This is required because:
 *   - proxy.ts reads cookies to check auth on /admin and /relawan routes
 *   - Server Components (admin layout, etc.) read cookies via createServerClient
 *
 * If we used the plain createClient from @supabase/supabase-js,
 * tokens would go to localStorage only — the proxy would never see them,
 * causing an infinite redirect loop (login → /admin → proxy sees no session → /login → ...).
 */
export function getSupabase(): SupabaseClient {
  if (_client) return _client

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      '[Blood-Connect] Variabel Supabase belum dikonfigurasi.\n' +
      'Buka file .env.local dan isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }

  _client = createBrowserClient(url, key)
  return _client
}

// Convenience re-export — but prefer getSupabase() in event handlers
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})


// Database type helper (akan diperluas seiring pertumbuhan schema)
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          name: string
          phone_number: string
          blood_type: 'A' | 'B' | 'AB' | 'O'
          rhesus: '+' | '-'
          sub_district: string
          role: 'volunteer' | 'admin'
          last_donated_at: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }
      blood_requests: {
        Row: {
          id: string
          patient_name: string
          contact_phone: string
          hospital_id: string
          blood_type: 'A' | 'B' | 'AB' | 'O'
          rhesus: '+' | '-'
          bags_needed: number
          bags_fulfilled: number
          proof_url: string | null
          status: 'pending' | 'approved' | 'completed' | 'rejected'
          admin_notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['blood_requests']['Row'], 'id' | 'bags_fulfilled' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['blood_requests']['Insert']>
      }
      hospitals: {
        Row: {
          id: string
          name: string
          address: string
          created_at: string
        }
      }
    }
  }
}
