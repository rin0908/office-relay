'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'
import { supabasePublishableKey, supabaseUrl } from '@/lib/env'

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (!cached) {
    cached = createBrowserClient<Database>(supabaseUrl(), supabasePublishableKey())
  }
  return cached
}
