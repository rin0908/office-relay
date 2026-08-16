'use server'

import { revalidatePath } from 'next/cache'
import { embedText, toVectorLiteral } from '@/lib/embeddings'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from './auth'

type ServiceKind = 'service_offers' | 'service_wants'

async function createService(kind: ServiceKind, formData: FormData): Promise<ActionState> {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  if (!title) return { error: 'タイトルを入力してください。' }

  const { data, error } = await supabase
    .from(kind)
    .insert({ org_id: org.id, title, description })
    .select('id')
    .single()

  if (error || !data) return { error: `登録に失敗しました：${error?.message ?? 'unknown error'}` }

  const {
    data: { session },
  } = await supabase.auth.getSession()
  const embedding = await embedText(`${title} ${description}`, session?.access_token)
  if (embedding) {
    await supabase.rpc('set_embedding', {
      p_table: kind,
      p_id: data.id,
      p_embedding: toVectorLiteral(embedding),
    })
  }

  revalidatePath('/services')
  return { message: '登録しました。' }
}

export async function createServiceOfferAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return createService('service_offers', formData)
}

export async function createServiceWantAction(
  _prev: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  return createService('service_wants', formData)
}

export async function deleteServiceAction(kind: ServiceKind, id: string): Promise<ActionState> {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from(kind).delete().eq('id', id)
  if (error) return { error: `削除できませんでした：${error.message}` }
  revalidatePath('/services')
  return { message: '削除しました。' }
}
