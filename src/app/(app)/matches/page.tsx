import Link from 'next/link'
import { MatchStatusBadge } from '@/components/badges'
import { RealtimeRefresher } from '@/components/realtime-refresher'
import { formatDateTime } from '@/lib/format'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { GenerateMatchesButton } from './generate-matches-button'

export default async function MatchesPage() {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('matches')
    .select(
      'id, total_score, status, startup_accepted_at, donor_accepted_at, created_at, donor_org_id, recipient_org_id, items(title, quantity), needs(title, quantity), transfers(id)',
    )
    .order('total_score', { ascending: false })

  const matches = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">マッチ</h1>
          <p className="mt-1 text-sm text-slate-600">
            スコアは資産40点・数量20点・サービス交換20点・距離10点・緊急度10点の合計100点満点です。
            スタートアップが受け取り希望 → 提供企業が承認、の2段階で成立します。
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <GenerateMatchesButton />
          <RealtimeRefresher tables={['matches', 'transfers']} />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          マッチを取得できませんでした：{error.message}
        </p>
      ) : null}

      {matches.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-slate-600">
            マッチはまだありません。資産・ニーズ・サービスを登録し、「マッチを再計算」を実行してください。
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {matches.map((match) => {
            const asDonor = match.donor_org_id === org.id
            const waitingForMe =
              (asDonor && match.status === 'pending_donor') ||
              (!asDonor && match.status === 'proposed')

            return (
              <li key={match.id}>
                <Link
                  href={`/matches/${match.id}`}
                  className="card flex flex-wrap items-center gap-4 p-5 hover:border-relay-500"
                >
                  <div className="flex w-20 shrink-0 flex-col items-center">
                    <span className="text-3xl font-black text-relay-700">
                      {Number(match.total_score).toFixed(0)}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">/ 100</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900">
                      {match.items?.title ?? '資産'}（{match.items?.quantity ?? 0}点） →{' '}
                      {match.needs?.title ?? 'ニーズ'}（{match.needs?.quantity ?? 0}点）
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {asDonor ? '自社が提供側' : '自社が受け取り側'} / 算出{' '}
                      {formatDateTime(match.created_at)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      受け取り希望: {match.startup_accepted_at ? '済' : '未'} / 提供企業承認:{' '}
                      {match.donor_accepted_at ? '済' : '未'}
                      {match.transfers ? ' / 受け渡し生成済み' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {waitingForMe ? (
                      <span className="badge bg-warn-100 text-warn-500">対応待ち</span>
                    ) : null}
                    <MatchStatusBadge status={match.status} />
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
