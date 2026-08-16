import { RealtimeRefresher } from '@/components/realtime-refresher'
import { CONNECTOR_JOB_STATUS_LABEL, formatDateTime } from '@/lib/format'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ConnectorJobForm } from './connector-job-form'

interface LogEntry {
  at?: string
  message?: string
}

export default async function ConnectorFactoryPage() {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data: jobs } = await supabase
    .from('connector_jobs')
    .select(
      'id, supplier_name, source_kind, status, devin_session_url, pull_request_url, log, error, created_at, updated_at',
    )
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Devin Connector Factory</h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            大手オフィス家具メーカーや廃棄業者から届く在庫データ（CSV / API）は、企業ごとに形式が
            異なります。ここでサンプルを登録すると Supabase Edge Function が Devin API
            を呼び出し、実際の Devin セッションがコネクタを実装して Pull Request を作成します。
            Devin API キーは Edge Function のシークレットにのみ保存され、ブラウザには渡りません。
          </p>
        </div>
        <RealtimeRefresher tables={['connector_jobs']} label="ジョブ進捗" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_3fr]">
        <div className="card p-6">
          <h2 className="text-base font-bold text-slate-900">コネクタ生成を依頼</h2>
          <div className="mt-4">
            <ConnectorJobForm />
          </div>
        </div>

        <section className="space-y-3">
          <h2 className="text-base font-bold text-slate-900">ジョブ一覧（{jobs?.length ?? 0}）</h2>
          {jobs && jobs.length > 0 ? (
            <ul className="space-y-3">
              {jobs.map((job) => {
                const log = Array.isArray(job.log) ? (job.log as LogEntry[]) : []
                return (
                  <li key={job.id} className="card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{job.supplier_name}</h3>
                        <p className="mt-1 text-xs text-slate-500">
                          {job.source_kind === 'csv' ? 'CSV' : 'API スペック'} / 作成{' '}
                          {formatDateTime(job.created_at)}
                        </p>
                      </div>
                      <span
                        className={`badge ${
                          job.status === 'failed'
                            ? 'bg-danger-100 text-danger-500'
                            : job.status === 'pr_created'
                              ? 'bg-accent-100 text-accent-500'
                              : 'bg-relay-100 text-relay-700'
                        }`}
                      >
                        {CONNECTOR_JOB_STATUS_LABEL[job.status] ?? job.status}
                      </span>
                    </div>

                    {job.devin_session_url ? (
                      <a
                        href={job.devin_session_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-sm font-semibold text-relay-600 hover:underline"
                      >
                        Devin セッションを開く →
                      </a>
                    ) : null}
                    {job.pull_request_url ? (
                      <a
                        href={job.pull_request_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block text-sm font-semibold text-accent-500 hover:underline"
                      >
                        Pull Request を開く →
                      </a>
                    ) : null}

                    {job.error ? (
                      <p className="mt-3 rounded-lg bg-danger-100 px-3 py-2 text-xs text-danger-500">
                        {job.error}
                      </p>
                    ) : null}

                    {log.length > 0 ? (
                      <ol className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                        {log.map((entry, index) => (
                          <li key={index} className="text-xs text-slate-500">
                            {entry.at ? `${formatDateTime(entry.at)} ` : ''}
                            {entry.message}
                          </li>
                        ))}
                      </ol>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="card p-6 text-sm text-slate-600">
              まだジョブがありません。サプライヤーのサンプルデータを登録してください。
            </p>
          )}
        </section>
      </div>
    </div>
  )
}
