import Link from 'next/link'
import { updateTransferStatusAction } from '@/app/actions/matches'
import { ActionButton } from '@/components/action-button'
import { TransferStatusBadge } from '@/components/badges'
import { RealtimeRefresher } from '@/components/realtime-refresher'
import { formatDateTime } from '@/lib/format'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function TransfersPage() {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase
    .from('transfers')
    .select(
      `id, status, scheduled_at, delivery_method, created_at,
       matches(id, total_score, donor_org_id, recipient_org_id, items(id, title, quantity),
               donor:organizations!matches_donor_org_id_fkey(name),
               recipient:organizations!matches_recipient_org_id_fkey(name))`,
    )
    .order('created_at', { ascending: false })

  const transfers = data ?? []

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">受け渡し</h1>
          <p className="mt-1 text-sm text-slate-600">
            双方がマッチを承認すると、データベーストリガーが受け渡し（Transfer）を自動生成します。
          </p>
        </div>
        <RealtimeRefresher tables={['transfers']} />
      </div>

      {error ? (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          取得できませんでした：{error.message}
        </p>
      ) : null}

      {transfers.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-600">
          受け渡しはまだありません。
          <Link href="/matches" className="ml-1 font-semibold text-relay-600 hover:underline">
            マッチ一覧
          </Link>
          から承認を進めてください。
        </div>
      ) : (
        <ul className="space-y-3">
          {transfers.map((transfer) => {
            const match = transfer.matches
            const isDonor = match?.donor_org_id === org.id
            return (
              <li key={transfer.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {match?.items?.title}（{match?.items?.quantity}点）
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {match?.donor?.name} → {match?.recipient?.name} / スコア{' '}
                      {Number(match?.total_score ?? 0).toFixed(0)}点
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      受け渡し予定 {formatDateTime(transfer.scheduled_at)} / 生成{' '}
                      {formatDateTime(transfer.created_at)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600">
                      {isDonor ? '自社が提供側' : '自社が受け取り側'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <TransferStatusBadge status={transfer.status} />
                    <div className="flex flex-wrap justify-end gap-2">
                      {transfer.status === 'scheduled' ? (
                        <ActionButton
                          action={updateTransferStatusAction.bind(null, transfer.id, 'in_progress')}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          受け渡し開始
                        </ActionButton>
                      ) : null}
                      {transfer.status === 'in_progress' ? (
                        <ActionButton
                          action={updateTransferStatusAction.bind(null, transfer.id, 'completed')}
                          className="btn-accent px-3 py-1 text-xs"
                        >
                          完了にする
                        </ActionButton>
                      ) : null}
                      {match ? (
                        <Link
                          href={`/matches/${match.id}`}
                          className="btn-secondary px-3 py-1 text-xs"
                        >
                          マッチ詳細
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
