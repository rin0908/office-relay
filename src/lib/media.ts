export const ITEM_IMAGES_BUCKET = 'item-images'

/**
 * {organization_id}/{item_id}/{filename}
 *
 * The first path segment is the organization id: Storage policies use it to
 * ensure a user can only write inside their own organization's folder.
 */
export function buildStoragePath(orgId: string, itemId: string, fileName: string): string {
  const safeName = fileName
    .normalize('NFKC')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .slice(-60)
  return `${orgId}/${itemId}/${Date.now()}_${safeName}`
}
