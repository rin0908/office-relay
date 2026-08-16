import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { supabasePublishableKey, supabaseUrl } from '@/lib/env'

/**
 * Server-side Supabase client bound to the request cookies.
 * Next.js 16: `cookies()` is async, so this helper is async too.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        } catch {
          // Called from a Server Component render pass: session refresh is
          // handled by the proxy (src/proxy.ts), so this is safe to ignore.
        }
      },
    },
  })
}
