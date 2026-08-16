import Link from 'next/link'
import { notFound } from 'next/navigation'
import { deleteItemMediaAction, setPrimaryItemMediaAction } from '@/app/actions/items'
import { ActionButton } from '@/components/action-button'
import { ItemStatusBadge } from '@/components/badges'
import { PhotoUploader, MAX_PHOTOS } from '@/components/photo-uploader'
import { categoryLabel, conditionLabel, formatDateTime, formatDeadline } from '@/lib/format'
import { signedUrlMap } from '@/lib/media-server'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data: item } = await supabase
    .from('items')
    .select(
      'id, owner_org_id, title, description, category, quantity, condition, public_location, pickup_deadline, status, created_at, organizations(name, org_type)',
    )
    .eq('id', id)
    .maybeSingle()

  if (!item) notFound()

  const [{ data: media }, { data: privateDetails }] = await Promise.all([
    supabase
      .from('item_media')
      .select('id, storage_path, is_primary, sort_order')
      .eq('item_id', id)
      .order('sort_order', { ascending: true }),
    // RLS decides whether this is readable: owner, or recipient of an accepted match
    supabase
      .from('item_private_details')
      .select('exact_pickup_address, contact_note')
      .eq('item_id', id)
      .maybeSingle(),
  ])

  const isOwner = item.owner_org_id === org.id
  const photos = media ?? []
  const signedUrls = await signedUrlMap(photos.map((photo) => photo.storage_path))
  const primary = photos.find((photo) => photo.is_primary) ?? photos[0]

  return (
    <div className="space-y-8">
      <Link href="/items" className="text-sm font-semibold text-relay-600 hover:underline">
        ← 提供資産一覧
      </Link>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="aspect-[4/3] w-full bg-slate-100">
              {primary && signedUrls[primary.storage_path] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrls[primary.storage_path]}
                  alt={item.title}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-slate-400">
                  写真未登録
                </div>
              )}
            </div>
          </div>

          {photos.length > 0 ? (
            <ul className="grid grid-cols-3 gap-3">
              {photos.map((photo) => (
                <li key={photo.id} className="card overflow-hidden">
                  <div className="aspect-square bg-slate-100">
                    {signedUrls[photo.storage_path] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={signedUrls[photo.storage_path]}
                        alt={item.title}
                        className="size-full object-cover"
                      />
                    ) : null}
                  </div>
                  {isOwner ? (
                    <div className="flex flex-wrap items-center gap-1 p-2">
                      {photo.is_primary ? (
                        <span className="badge bg-relay-100 text-relay-700">メイン</span>
                      ) : (
                        <ActionButton
                          action={setPrimaryItemMediaAction.bind(null, photo.id)}
                          className="btn-secondary px-2 py-1 text-xs"
                        >
                          メインにする
                        </ActionButton>
                      )}
                      <ActionButton
                        action={deleteItemMediaAction.bind(null, photo.id)}
                        className="btn-danger px-2 py-1 text-xs"
                        confirmMessage="この写真を削除しますか？"
                      >
                        削除
                      </ActionButton>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {isOwner && photos.length < MAX_PHOTOS ? (
            <div className="card p-5">
              <h2 className="text-base font-bold text-slate-900">写真を追加</h2>
              <div className="mt-3">
                <PhotoUploader orgId={org.id} itemId={item.id} existingCount={photos.length} />
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-xl font-bold text-slate-900">{item.title}</h1>
              <ItemStatusBadge status={item.status} />
            </div>
            <p className="mt-1 text-sm font-semibold text-slate-600">
              {item.organizations?.name ?? '—'}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {item.description || '説明は登録されていません。'}
            </p>
            <dl className="mt-4 space-y-2 text-sm">
              {[
                ['カテゴリ', categoryLabel(item.category)],
                ['数量', `${item.quantity}点`],
                ['状態', conditionLabel(item.condition)],
                ['公開エリア', item.public_location],
                [
                  '引き取り期限',
                  `${formatDateTime(item.pickup_deadline)}（${formatDeadline(item.pickup_deadline)}）`,
                ],
                ['登録日時', formatDateTime(item.created_at)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-100 pb-2">
                  <dt className="font-semibold text-slate-500">{label}</dt>
                  <dd className="text-right text-slate-800">{value}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="text-base font-bold text-slate-900">引き取り先情報</h2>
            {privateDetails ? (
              <div className="mt-3 space-y-2 text-sm text-slate-800">
                <p>
                  <span className="font-semibold text-slate-500">正確な住所: </span>
                  {privateDetails.exact_pickup_address || '未登録'}
                </p>
                <p>
                  <span className="font-semibold text-slate-500">連絡事項: </span>
                  {privateDetails.contact_note || '未登録'}
                </p>
                <p className="text-xs text-slate-400">
                  {isOwner
                    ? 'この情報は自社と、マッチ成立後の相手企業のみが閲覧できます。'
                    : 'マッチ成立により開示されています。'}
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                正確な住所と連絡事項は、双方がマッチを承認した後に開示されます（Row Level Security
                によりデータベース側で制御）。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
