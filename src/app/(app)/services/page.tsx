import { deleteServiceAction } from '@/app/actions/services'
import { ActionButton } from '@/components/action-button'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ServiceForm } from './service-form'

export default async function ServicesPage() {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const [{ data: offers }, { data: wants }] = await Promise.all([
    supabase
      .from('service_offers')
      .select('id, title, description, org_id, organizations(name)')
      .order('created_at', { ascending: false }),
    supabase
      .from('service_wants')
      .select('id, title, description, org_id, organizations(name)')
      .order('created_at', { ascending: false }),
  ])

  const myOffers = (offers ?? []).filter((row) => row.org_id === org.id)
  const myWants = (wants ?? []).filter((row) => row.org_id === org.id)
  const otherOffers = (offers ?? []).filter((row) => row.org_id !== org.id)
  const otherWants = (wants ?? []).filter((row) => row.org_id !== org.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">サービス交換</h1>
        <p className="mt-1 text-sm text-slate-600">
          OFFICE RELAY のもう一つの軸です。提供企業の「受けたいサービス」と、スタートアップの
          「提供できるサービス」の意味的な近さ（pgvector）がマッチスコアの20点に反映されます。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="card p-6">
            <h2 className="text-base font-bold text-slate-900">提供できるサービス（Service Offer）</h2>
            <p className="mt-1 text-xs text-slate-500">
              例）生成AI社内研修、AI業務自動化の実装支援、Webサイト制作
            </p>
            <div className="mt-4">
              <ServiceForm kind="offer" />
            </div>
          </div>
          <ul className="space-y-2">
            {myOffers.map((offer) => (
              <li key={offer.id} className="card flex items-start justify-between gap-3 p-4">
                <span>
                  <span className="block text-sm font-bold text-slate-900">{offer.title}</span>
                  <span className="mt-1 block text-xs text-slate-600">{offer.description}</span>
                </span>
                <ActionButton
                  action={deleteServiceAction.bind(null, 'service_offers', offer.id)}
                  className="btn-danger px-3 py-1 text-xs"
                >
                  削除
                </ActionButton>
              </li>
            ))}
            {myOffers.length === 0 ? (
              <li className="card p-5 text-sm text-slate-600">まだ登録がありません。</li>
            ) : null}
          </ul>
        </section>

        <section className="space-y-4">
          <div className="card p-6">
            <h2 className="text-base font-bold text-slate-900">受けたいサービス（Service Want）</h2>
            <p className="mt-1 text-xs text-slate-500">
              例）社員向けの生成AIリテラシー研修、業務プロセスのAI自動化
            </p>
            <div className="mt-4">
              <ServiceForm kind="want" />
            </div>
          </div>
          <ul className="space-y-2">
            {myWants.map((want) => (
              <li key={want.id} className="card flex items-start justify-between gap-3 p-4">
                <span>
                  <span className="block text-sm font-bold text-slate-900">{want.title}</span>
                  <span className="mt-1 block text-xs text-slate-600">{want.description}</span>
                </span>
                <ActionButton
                  action={deleteServiceAction.bind(null, 'service_wants', want.id)}
                  className="btn-danger px-3 py-1 text-xs"
                >
                  削除
                </ActionButton>
              </li>
            ))}
            {myWants.length === 0 ? (
              <li className="card p-5 text-sm text-slate-600">まだ登録がありません。</li>
            ) : null}
          </ul>
        </section>
      </div>

      <section className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            他社が提供できるサービス（{otherOffers.length}）
          </h2>
          <ul className="mt-3 space-y-2">
            {otherOffers.map((offer) => (
              <li key={offer.id} className="card p-4">
                <span className="block text-sm font-bold text-slate-900">{offer.title}</span>
                <span className="mt-1 block text-xs text-slate-500">
                  {offer.organizations?.name}
                </span>
              </li>
            ))}
            {otherOffers.length === 0 ? (
              <li className="card p-5 text-sm text-slate-600">登録はまだありません。</li>
            ) : null}
          </ul>
        </div>
        <div>
          <h2 className="text-base font-bold text-slate-900">
            他社が受けたいサービス（{otherWants.length}）
          </h2>
          <ul className="mt-3 space-y-2">
            {otherWants.map((want) => (
              <li key={want.id} className="card p-4">
                <span className="block text-sm font-bold text-slate-900">{want.title}</span>
                <span className="mt-1 block text-xs text-slate-500">{want.organizations?.name}</span>
              </li>
            ))}
            {otherWants.length === 0 ? (
              <li className="card p-5 text-sm text-slate-600">登録はまだありません。</li>
            ) : null}
          </ul>
        </div>
      </section>
    </div>
  )
}
