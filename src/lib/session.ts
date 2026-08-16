import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { Database } from '@/lib/database.types'

export type Organization = Database['public']['Tables']['organizations']['Row']

export interface SessionContext {
  user: User
  org: Organization
  role: string
}

export async function getUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

export async function getSessionContext(): Promise<SessionContext | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('org_members')
    .select('role, organizations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const org = data?.organizations as Organization | null | undefined
  if (!org) return null

  return { user, org, role: data?.role ?? 'owner' }
}

/** Guard for every authenticated page: pushes to login / onboarding. */
export async function requireSessionContext(): Promise<SessionContext> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const context = await getSessionContext()
  if (!context) redirect('/onboarding')
  return context
}

export function isDonor(org: Organization): boolean {
  return org.org_type === 'donor'
}
