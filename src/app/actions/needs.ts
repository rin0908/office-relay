'use server'

import { revalidatePath } from 'next/cache'
import { findArea } from '@/lib/areas'
import { embedText, toVectorLiteral } from '@/lib/embeddings'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from './auth'

export interface CreateNeedState extends ActionState {
  needId?: string
}

export async function createNeedAction(
  _prev: CreateNeedState | undefined,
  formData: FormData,
): Promise<CreateNeedState> {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const quantity = Number(formData.get('quantity') ?? 0)
  const areaValue = String(formData.get('area') ?? '')
  const neededBy = String(formData.get('needed_by') ?? '')

  if (!title) return { error: '必要な資産名を入力してください。' }
  if (!category) return { error: 'カテゴリを選択してください。' }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: '数量は1以上で入力してください。' }
  }

  const area = findArea(areaValue) ?? findArea(org.public_location)

  const { data: need, error } = await supabase
    .from('needs')
    .insert({
      org_id: org.id,
      title,
      description,
      category,
      quantity,
      public_location: area?.label ?? org.public_location,
      needed_by: neededBy ? new Date(neededBy).toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !need) return { error: `登録に失敗しました：${error?.message ?? 'unknown error'}` }

  if (area) {
    await supabase.rpc('set_need_location', {
      p_need_id: need.id,
      p_lat: area.lat,
      p_lng: area.lng,
    })
  }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const embedding = await embedText(`${title} ${description} ${category}`, session?.access_token)
  if (embedding) {
    await supabase.rpc('set_embedding', {
      p_table: 'needs',
      p_id: need.id,
      p_embedding: toVectorLiteral(embedding),
    })
  }

  revalidatePath('/needs')
  revalidatePath('/dashboard')
  return { needId: need.id, message: 'ニーズを登録しました。' }
}

export async function deleteNeedAction(needId: string): Promise<ActionState> {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('needs').delete().eq('id', needId)
  if (error) return { error: `削除できませんでした：${error.message}` }
  revalidatePath('/needs')
  return { message: 'ニーズを削除しました。' }
}
