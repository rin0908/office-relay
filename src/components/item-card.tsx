import Link from 'next/link'
import { ItemStatusBadge } from '@/components/badges'
import { categoryLabel, formatDeadline } from '@/lib/format'

export interface ItemCardData {
  id: string
  title: string
  category: string
  quantity: number
  public_location: string
  pickup_deadline: string | null
  status: string
  organizations?: { name: string } | null
  item_media?: { storage_path: string; is_primary: boolean }[] | null
}

export function ItemCard({
  item,
  signedUrls,
}: {
  item: ItemCardData
  signedUrls: Record<string, string>
}) {
  const media = item.item_media ?? []
  const primary = media.find((m) => m.is_primary) ?? media[0]
  const imageUrl = primary ? signedUrls[primary.storage_path] : undefined

  return (
    <Link href={`/items/${item.id}`} className="card overflow-hidden hover:border-relay-500">
      <div className="aspect-[4/3] w-full bg-slate-100">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={item.title} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1 text-slate-400">
            <span className="text-2xl">🗃</span>
            <span className="text-xs font-semibold">写真未登録</span>
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
          <ItemStatusBadge status={item.status} />
        </div>
        <p className="text-xs text-slate-500">
          {categoryLabel(item.category)} / {item.quantity}点 / {item.public_location}
        </p>
        {item.organizations?.name ? (
          <p className="text-xs font-semibold text-slate-600">{item.organizations.name}</p>
        ) : null}
        <p className="text-xs text-warn-500">引き取り期限: {formatDeadline(item.pickup_deadline)}</p>
        {media.length > 0 ? (
          <p className="text-xs text-slate-400">写真 {media.length} 枚</p>
        ) : null}
      </div>
    </Link>
  )
}
