import Link from 'next/link'
import { notFound } from 'next/navigation'
import { acceptMatchAction, rejectMatchAction } from '@/app/actions/matches'
import { ActionButton } from '@/components/action-button'
import { MatchStatusBadge, TransferStatusBadge } from '@/components/badges'
import { RealtimeRefresher } from '@/components/realtime-refresher'
import { ScoreBreakdown, ScoreTotal, type StoredScoreDetail } from '@/components/score-breakdown'
import { categoryLabel, formatDateTime, formatDeadline } from '@/lib/format'
import { signedUrlMap } from '@/lib/media-server'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data: match } = await supabase
    .from('matches')
    .select(
      `id, status, total_score, asset_score, quantity_score, service_score, location_score,
       urgency_score, score_detail, startup_accepted_at, donor_accepted_at, created_at,
       donor_org_id, recipient_org_id,
       items(id, title, description, category, quantity, public_location, pickup_deadline, item_media(storage_path, is_primary)),
       needs(id, title, description, category, quantity, public_location, needed_by),
       donor:organizations!matches_donor_org_id_fkey(name, public_location),
       recipient:organizations!matches_recipient_org_id_fkey(name, public_location),
       transfers(id, status, scheduled_at, delivery_method)`,
    )
    .eq('id', id)
    .maybeSingle()

  if (!match) notFound()

  const isDonor = match.donor_org_id === org.id
  const isRecipient = match.recipient_org_id === org.id
  const transfer = match.transfers
  const media = match.items?.item_media ?? []
  const signedUrls = await signedUrlMap(media.map((m) => m.storage_path))
  const primary = media.find((m) => m.is_primary) ?? media[0]

  const canRecipientAccept = isRecipient && !match.startup_accepted_at && match.status !== 'rejected'
  const canDonorAccept =
    isDonor && Boolean(match.startup_accepted_at) && !match.donor_accepted_at && match.status !== 'rejected'

  // exact address becomes readable through RLS once both sides accepted
  const { data: privateDetails } = await supabase
    .from('item_private_details')
    .select('exact_pickup_address, contact_note')
    .eq('item_id', match.items?.id ?? '')
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/matches" className="text-sm font-semibold text-relay-600 hover:underline">
          ← マッチ一覧
        </Link>
        <RealtimeRefresher tables={['matches', 'transfers']} />
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <ScoreTotal total={Number(match.total_score)} />
              <MatchStatusBadge status={match.status} />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {match.donor?.name}（{match.donor?.public_location}） →{' '}
              {match.recipient?.name}（{match.recipient?.public_location}）
            </p>
            <p className="mt-1 text-xs text-slate-400">算出 {formatDateTime(match.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canRecipientAccept ? (
              <ActionButton
                action={acceptMatchAction.bind(null, match.id)}
                className="btn-accent"
                pendingLabel="送信中…"
              >
                この資産を受け取りたい
              </ActionButton>
            ) : null}
            {canDonorAccept ? (
              <ActionButton
                action={acceptMatchAction.bind(null, match.id)}
                className="btn-accent"
                pendingLabel="承認中…"
              >
                提供を承認する
              </ActionButton>
            ) : null}
            {match.status !== 'accepted' && match.status !== 'rejected' ? (
              <ActionButton
                action={rejectMatchAction.bind(null, match.id)}
                className="btn-secondary"
                confirmMessage="このマッチを見送りますか？"
              >
                見送る
              </ActionButton>
            ) : null}
          </div>
        </div>

        <ol className="mt-6 grid gap-2 sm:grid-cols-3">
          {[
            {
              label: '1. スタートアップが受け取り希望',
              done: Boolean(match.startup_accepted_at),
              at: match.startup_accepted_at,
            },
            {
              label: '2. 提供企業が承認',
              done: Boolean(match.donor_accepted_at),
              at: match.donor_accepted_at,
            },
            {
              label: '3. 受け渡しが自動生成',
              done: Boolean(transfer),
              at: transfer ? transfer.scheduled_at : null,
            },
          ].map((step) => (
            <li
              key={step.label}
              className={`rounded-lg border p-3 text-sm ${
                step.done
                  ? 'border-accent-500 bg-accent-100 text-accent-500'
                  : 'border-slate-200 bg-slate-50 text-slate-500'
              }`}
            >
              <span className="block font-bold">{step.label}</span>
              <span className="mt-1 block text-xs">
                {step.done ? formatDateTime(step.at) : '未完了'}
              </span>
            </li>
          ))}
        </ol>

        {match.status === 'accepted' ? (
          <p className="mt-4 rounded-lg bg-accent-100 px-4 py-3 text-sm font-bold text-accent-500">
            MATCH ACCEPTED — 双方の承認により受け渡しが自動生成されました。
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="text-base font-bold text-slate-900">スコア内訳</h2>
            <div className="mt-4">
              <ScoreBreakdown
                detail={match.score_detail as StoredScoreDetail | null}
                fallback={{
                  asset_fit: Number(match.asset_score),
                  quantity_fit: Number(match.quantity_score),
                  service_fit: Number(match.service_score),
                  location_fit: Number(match.location_score),
                  urgency_fit: Number(match.urgency_score),
                }}
              />
            </div>
          </div>

          {transfer ? (
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-slate-900">受け渡し（Transfer）</h2>
                <TransferStatusBadge status={transfer.status} />
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <dt className="font-semibold text-slate-500">受け渡し予定</dt>
                  <dd className="text-slate-800">{formatDateTime(transfer.scheduled_at)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="font-semibold text-slate-500">方法</dt>
                  <dd className="text-slate-800">
                    {transfer.delivery_method === 'donor_pickup' ? '受け取り側が引き取り' : transfer.delivery_method}
                  </dd>
                </div>
              </dl>
              <Link
                href="/transfers"
                className="mt-4 inline-block text-sm font-semibold text-relay-600 hover:underline"
              >
                受け渡し一覧へ →
              </Link>
            </div>
          ) : null}

          <div className="card p-6">
            <h2 className="text-base font-bold text-slate-900">引き取り先情報</h2>
            {privateDetails ? (
              <div className="mt-3 space-y-1 text-sm text-slate-800">
                <p>
                  <span className="font-semibold text-slate-500">正確な住所: </span>
                  {privateDetails.exact_pickup_address || '未登録'}
                </p>
                <p>
                  <span className="font-semibold text-slate-500">連絡事項: </span>
                  {privateDetails.contact_note || '未登録'}
                </p>
              </div>
            ) : (
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                正確な住所は双方の承認後に開示されます（Row Level Security による制御）。
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="aspect-[4/3] bg-slate-100">
              {primary && signedUrls[primary.storage_path] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={signedUrls[primary.storage_path]}
                  alt={match.items?.title ?? ''}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center text-sm text-slate-400">
                  写真未登録
                </div>
              )}
            </div>
            <div className="space-y-2 p-5">
              <h2 className="text-sm font-bold text-slate-900">
                提供資産: {match.items?.title}
              </h2>
              <p className="text-xs text-slate-500">
                {categoryLabel(match.items?.category ?? '')} / {match.items?.quantity}点 /{' '}
                {match.items?.public_location}
              </p>
              <p className="text-xs text-warn-500">
                引き取り期限: {formatDateTime(match.items?.pickup_deadline)}（
                {formatDeadline(match.items?.pickup_deadline)}）
              </p>
              <p className="text-sm text-slate-700">{match.items?.description}</p>
              <Link
                href={`/items/${match.items?.id}`}
                className="inline-block text-sm font-semibold text-relay-600 hover:underline"
              >
                資産の詳細 →
              </Link>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-bold text-slate-900">ニーズ: {match.needs?.title}</h2>
            <p className="mt-1 text-xs text-slate-500">
              {categoryLabel(match.needs?.category ?? '')} / {match.needs?.quantity}点 /{' '}
              {match.needs?.public_location} / 希望時期 {formatDateTime(match.needs?.needed_by)}
            </p>
            <p className="mt-2 text-sm text-slate-700">{match.needs?.description}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
