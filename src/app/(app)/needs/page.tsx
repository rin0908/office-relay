import { deleteNeedAction } from '@/app/actions/needs'
import { ActionButton } from '@/components/action-button'
import { NeedStatusBadge } from '@/components/badges'
import { AREAS, findArea } from '@/lib/areas'
import { CATEGORIES, categoryLabel, formatDateTime } from '@/lib/format'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { NeedForm } from './need-form'

export default async function NeedsPage() {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('needs')
    .select('id, org_id, title, description, category, quantity, public_location, needed_by, status, created_at, organizations(name)')
    .order('created_at', { ascending: false })

  const needs = data ?? []
  const mine = needs.filter((need) => need.org_id === org.id)
  const others = needs.filter((need) => need.org_id !== org.id)
  const defaultArea = findArea(org.public_location)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">ニーズ</h1>
        <p className="mt-1 text-sm text-slate-600">
          必要な資産を登録すると、提供企業の余剰資産と自動でマッチングされます。
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-900">ニーズを登録</h2>
          <div className="mt-4">
            <NeedForm
              areas={AREAS}
              defaultAreaValue={defaultArea?.value ?? ''}
              categories={CATEGORIES.map((c) => ({ ...c }))}
            />
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h2 className="text-base font-bold text-slate-900">自社のニーズ（{mine.length}）</h2>
            {error ? (
              <p role="alert" className="mt-3 rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
                取得できませんでした：{error.message}
              </p>
            ) : null}
            {mine.length > 0 ? (
              <ul className="mt-3 space-y-3">
                {mine.map((need) => (
                  <li key={need.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{need.title}</h3>
                      <NeedStatusBadge status={need.status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {categoryLabel(need.category)} / {need.quantity}点 / {need.public_location} /
                      希望時期 {formatDateTime(need.needed_by)}
                    </p>
                    {need.description ? (
                      <p className="mt-2 text-sm text-slate-700">{need.description}</p>
                    ) : null}
                    {need.status === 'open' ? (
                      <div className="mt-3">
                        <ActionButton
                          action={deleteNeedAction.bind(null, need.id)}
                          className="btn-danger px-3 py-1 text-xs"
                          confirmMessage="このニーズを削除しますか？"
                        >
                          削除
                        </ActionButton>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card mt-3 p-5 text-sm text-slate-600">まだニーズがありません。</p>
            )}
          </section>

          <section>
            <h2 className="text-base font-bold text-slate-900">他社のニーズ（{others.length}）</h2>
            {others.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {others.map((need) => (
                  <li key={need.id} className="card flex flex-wrap items-center justify-between gap-2 p-4">
                    <span>
                      <span className="block text-sm font-bold text-slate-900">{need.title}</span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {need.organizations?.name} / {categoryLabel(need.category)} / {need.quantity}
                        点 / {need.public_location}
                      </span>
                    </span>
                    <NeedStatusBadge status={need.status} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="card mt-3 p-5 text-sm text-slate-600">他社のニーズはまだありません。</p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
