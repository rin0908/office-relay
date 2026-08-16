import Link from 'next/link'
import { ItemCard, type ItemCardData } from '@/components/item-card'
import { signedUrlMap } from '@/lib/media-server'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const SELECT =
  'id, title, category, quantity, public_location, pickup_deadline, status, owner_org_id, organizations(name), item_media(storage_path, is_primary)'

export default async function ItemsPage() {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('items')
    .select(SELECT)
    .order('created_at', { ascending: false })

  const items = (data ?? []) as unknown as (ItemCardData & { owner_org_id: string })[]
  const mine = items.filter((item) => item.owner_org_id === org.id)
  const others = items.filter((item) => item.owner_org_id !== org.id)

  const signedUrls = await signedUrlMap(
    items.flatMap((item) => (item.item_media ?? []).map((media) => media.storage_path)),
  )

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">提供資産</h1>
          <p className="mt-1 text-sm text-slate-600">
            余剰オフィス資産の一覧です。正確な引き取り住所はマッチ成立後にのみ開示されます。
          </p>
        </div>
        <Link href="/items/new" className="btn-primary">
          資産を登録する
        </Link>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          資産を取得できませんでした：{error.message}
        </p>
      ) : null}

      <section>
        <h2 className="text-base font-bold text-slate-900">自社の提供資産（{mine.length}）</h2>
        {mine.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mine.map((item) => (
              <ItemCard key={item.id} item={item} signedUrls={signedUrls} />
            ))}
          </div>
        ) : (
          <div className="card mt-4 p-6 text-sm text-slate-600">
            まだ登録がありません。
            <Link href="/items/new" className="ml-1 font-semibold text-relay-600 hover:underline">
              最初の資産を登録
            </Link>
            してください。
          </div>
        )}
      </section>

      <section>
        <h2 className="text-base font-bold text-slate-900">他社の公開資産（{others.length}）</h2>
        {others.length > 0 ? (
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((item) => (
              <ItemCard key={item.id} item={item} signedUrls={signedUrls} />
            ))}
          </div>
        ) : (
          <div className="card mt-4 p-6 text-sm text-slate-600">
            現在、他社が公開している資産はありません。
          </div>
        )}
      </section>
    </div>
  )
}
