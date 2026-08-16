'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { findArea } from '@/lib/areas'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from './auth'

export async function createOrganizationAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const name = String(formData.get('name') ?? '').trim()
  const orgType = String(formData.get('org_type') ?? '')
  const areaValue = String(formData.get('area') ?? '')

  if (!name) return { error: '企業・団体名を入力してください。' }
  if (orgType !== 'donor' && orgType !== 'startup') {
    return { error: '組織種別を選択してください。' }
  }
  const area = findArea(areaValue)
  if (!area) return { error: '公開エリアを選択してください。' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('create_organization', {
    p_name: name,
    p_org_type: orgType,
    p_public_location: area.label,
    p_lat: area.lat,
    p_lng: area.lng,
  })

  if (error) return { error: `組織を作成できませんでした：${error.message}` }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
