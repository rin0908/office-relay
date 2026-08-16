'use server'

import { revalidatePath } from 'next/cache'
import { findArea } from '@/lib/areas'
import { embedText, toVectorLiteral } from '@/lib/embeddings'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from './auth'

export interface CreateItemState extends ActionState {
  itemId?: string
}

/** Registers a surplus asset. Photos are uploaded afterwards, from the browser. */
export async function createItemAction(
  _prev: CreateItemState | undefined,
  formData: FormData,
): Promise<CreateItemState> {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim()
  const category = String(formData.get('category') ?? '').trim()
  const quantity = Number(formData.get('quantity') ?? 0)
  const condition = String(formData.get('condition') ?? 'good')
  const areaValue = String(formData.get('area') ?? '')
  const pickupDeadline = String(formData.get('pickup_deadline') ?? '')
  const exactAddress = String(formData.get('exact_pickup_address') ?? '').trim()
  const contactNote = String(formData.get('contact_note') ?? '').trim()

  if (!title) return { error: '資産名を入力してください。' }
  if (!category) return { error: 'カテゴリを選択してください。' }
  if (!Number.isFinite(quantity) || quantity < 1) {
    return { error: '数量は1以上で入力してください。' }
  }

  const area = findArea(areaValue) ?? findArea(org.public_location)

  const { data: item, error } = await supabase
    .from('items')
    .insert({
      owner_org_id: org.id,
      title,
      description,
      category,
      quantity,
      condition,
      public_location: area?.label ?? org.public_location,
      pickup_deadline: pickupDeadline ? new Date(pickupDeadline).toISOString() : null,
    })
    .select('id')
    .single()

  if (error || !item) return { error: `登録に失敗しました：${error?.message ?? 'unknown error'}` }

  // exact address is stored separately from the public asset data
  const { error: privateError } = await supabase.from('item_private_details').upsert({
    item_id: item.id,
    exact_pickup_address: exactAddress,
    contact_note: contactNote,
  })
  if (privateError) return { error: `引き取り先情報の保存に失敗しました：${privateError.message}` }

  if (area) {
    await supabase.rpc('set_item_location', {
      p_item_id: item.id,
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
      p_table: 'items',
      p_id: item.id,
      p_embedding: toVectorLiteral(embedding),
    })
  }

  revalidatePath('/items')
  revalidatePath('/dashboard')
  return { itemId: item.id, message: '資産を登録しました。' }
}

export async function registerItemMediaAction(
  itemId: string,
  storagePaths: string[],
): Promise<ActionState> {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { count } = await supabase
    .from('item_media')
    .select('id', { count: 'exact', head: true })
    .eq('item_id', itemId)

  const existing = count ?? 0
  if (existing + storagePaths.length > 3) {
    return { error: '写真は1つの資産につき最大3枚までです。' }
  }

  const rows = storagePaths.map((storage_path, index) => ({
    item_id: itemId,
    storage_path,
    is_primary: existing === 0 && index === 0,
    sort_order: existing + index,
  }))

  const { error } = await supabase.from('item_media').insert(rows)
  if (error) return { error: `写真情報の保存に失敗しました：${error.message}` }

  revalidatePath(`/items/${itemId}`)
  revalidatePath('/items')
  return { message: '写真を追加しました。' }
}

export async function deleteItemMediaAction(mediaId: string): Promise<ActionState> {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data: media, error: fetchError } = await supabase
    .from('item_media')
    .select('id, item_id, storage_path, is_primary')
    .eq('id', mediaId)
    .single()
  if (fetchError || !media) return { error: '写真が見つかりませんでした。' }

  const { error: storageError } = await supabase.storage
    .from('item-images')
    .remove([media.storage_path])
  if (storageError) return { error: `Storageから削除できませんでした：${storageError.message}` }

  const { error } = await supabase.from('item_media').delete().eq('id', mediaId)
  if (error) return { error: `写真を削除できませんでした：${error.message}` }

  if (media.is_primary) {
    const { data: next } = await supabase
      .from('item_media')
      .select('id')
      .eq('item_id', media.item_id)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()
    if (next) {
      await supabase.from('item_media').update({ is_primary: true }).eq('id', next.id)
    }
  }

  revalidatePath(`/items/${media.item_id}`)
  revalidatePath('/items')
  return { message: '写真を削除しました。' }
}

export async function setPrimaryItemMediaAction(mediaId: string): Promise<ActionState> {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data: media, error: fetchError } = await supabase
    .from('item_media')
    .select('id, item_id')
    .eq('id', mediaId)
    .single()
  if (fetchError || !media) return { error: '写真が見つかりませんでした。' }

  await supabase.from('item_media').update({ is_primary: false }).eq('item_id', media.item_id)
  const { error } = await supabase.from('item_media').update({ is_primary: true }).eq('id', mediaId)
  if (error) return { error: `メイン写真を設定できませんでした：${error.message}` }

  revalidatePath(`/items/${media.item_id}`)
  revalidatePath('/items')
  return { message: 'メイン写真を変更しました。' }
}
