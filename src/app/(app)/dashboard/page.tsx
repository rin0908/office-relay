import Link from 'next/link'
import { MatchStatusBadge, TransferStatusBadge } from '@/components/badges'
import { RealtimeRefresher } from '@/components/realtime-refresher'
import { formatDateTime } from '@/lib/format'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { GenerateMatchesButton } from '../matches/generate-matches-button'

export default async function DashboardPage() {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const [items, needs, offers, wants, matches, transfers] = await Promise.all([
    supabase
      .from('items')
      .select('id', { count: 'exact', head: true })
      .eq('owner_org_id', org.id),
    supabase.from('needs').select('id', { count: 'exact', head: true }).eq('org_id', org.id),
    supabase
      .from('service_offers')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id),
    supabase
      .from('service_wants')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', org.id),
    supabase
      .from('matches')
      .select('id, total_score, status, created_at, items(title), needs(title)')
      .order('total_score', { ascending: false })
      .limit(5),
    supabase
      .from('transfers')
      .select('id, status, scheduled_at, matches(items(title))')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const isDonor = org.org_type === 'donor'

  const stats = [
    { label: '提供資産', value: items.count ?? 0, href: '/items' },
    { label: 'ニーズ', value: needs.count ?? 0, href: '/needs' },
    { label: '提供できるサービス', value: offers.count ?? 0, href: '/services' },
    { label: '受けたいサービス', value: wants.count ?? 0, href: '/services' },
  ]

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">ダッシュボード</h1>
          <p className="mt-1 text-sm text-slate-600">
            {org.name}（{org.public_location}）のリレー状況
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <GenerateMatchesButton />
          <RealtimeRefresher tables={['matches', 'transfers']} />
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card p-4 hover:border-relay-500">
            <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-black text-slate-900">{stat.value}</p>
          </Link>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">スコア上位のマッチ</h2>
            <Link href="/matches" className="text-sm font-semibold text-relay-600 hover:underline">
              すべて見る
            </Link>
          </div>
          {matches.data && matches.data.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {matches.data.map((match) => (
                <li key={match.id}>
                  <Link
                    href={`/matches/${match.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3 hover:border-relay-500"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-800">
                        {match.items?.title ?? '資産'} → {match.needs?.title ?? 'ニーズ'}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {formatDateTime(match.created_at)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <MatchStatusBadge status={match.status} />
                      <span className="text-lg font-black text-relay-700">
                        {Number(match.total_score).toFixed(0)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              まだマッチがありません。
              {isDonor
                ? '提供資産を登録してから「マッチを再計算」を実行してください。'
                : 'ニーズとサービス提供を登録してから「マッチを再計算」を実行してください。'}
            </p>
          )}
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">受け渡し</h2>
            <Link href="/transfers" className="text-sm font-semibold text-relay-600 hover:underline">
              すべて見る
            </Link>
          </div>
          {transfers.data && transfers.data.length > 0 ? (
            <ul className="mt-4 space-y-3">
              {transfers.data.map((transfer) => (
                <li
                  key={transfer.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 p-3"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {transfer.matches?.items?.title ?? '資産'}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      予定 {formatDateTime(transfer.scheduled_at)}
                    </span>
                  </span>
                  <TransferStatusBadge status={transfer.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">
              双方が承認したマッチから、受け渡しが自動生成されます。
            </p>
          )}
        </div>
      </section>

      <section className="card p-5">
        <h2 className="text-base font-bold text-slate-900">Golden Path</h2>
        <ol className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-5">
          {[
            ['1', '資産を登録', '/items/new'],
            ['2', 'ニーズを登録', '/needs'],
            ['3', 'マッチを算出', '/matches'],
            ['4', '双方が承認', '/matches'],
            ['5', '受け渡し', '/transfers'],
          ].map(([step, label, href]) => (
            <li key={step}>
              <Link href={href} className="block rounded-lg bg-slate-50 p-3 hover:bg-relay-50">
                <span className="block text-xs font-bold text-relay-600">STEP {step}</span>
                <span className="mt-1 block font-semibold text-slate-800">{label}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
