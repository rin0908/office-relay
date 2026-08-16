import { ITEM_IMAGES_BUCKET } from '@/lib/media'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const SIGNED_URL_TTL_SECONDS = 60 * 60

/**
 * The `item-images` bucket is private: images are always served through
 * short-lived signed URLs created for the signed-in user.
 */
export async function signedUrlMap(paths: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)))
  if (unique.length === 0) return {}

  const supabase = await createSupabaseServerClient()
  const { data, error } = await supabase.storage
    .from(ITEM_IMAGES_BUCKET)
    .createSignedUrls(unique, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    console.warn('[media] could not sign urls:', error?.message)
    return {}
  }

  const map: Record<string, string> = {}
  data.forEach((entry, index) => {
    const path = entry.path ?? unique[index]
    if (entry.signedUrl && path) map[path] = entry.signedUrl
  })
  return map
}
