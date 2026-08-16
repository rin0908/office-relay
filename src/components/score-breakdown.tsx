import { SCORE_LABELS, SCORE_WEIGHTS, type ScoreComponent, type ScoreDimension } from '@/lib/matching'

const SIGNAL_LABEL: Record<string, string> = {
  lexical: 'テキスト類似度',
  category: 'カテゴリ一致',
  pgvector: 'pgvector 意味類似度',
  quantity: '数量',
  postgis: 'PostGIS 距離',
  text: '公開エリア文字列',
  temporal: '引き取り期限',
  need_deadline: '希望時期',
}

export interface StoredScoreDetail {
  engine?: string
  engine_version?: string
  generated_at?: string
  components?: ScoreComponent[]
  raw_signals?: {
    asset_similarity?: number | null
    service_similarity?: number | null
    distance_m?: number | null
  }
}

function Bar({ score, max }: { score: number; max: number }) {
  const ratio = max > 0 ? Math.min(1, score / max) : 0
  const tone = ratio >= 0.75 ? 'bg-accent-500' : ratio >= 0.4 ? 'bg-relay-500' : 'bg-warn-500'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${ratio * 100}%` }} />
    </div>
  )
}

export function ScoreTotal({ total }: { total: number }) {
  return (
    <div className="flex items-baseline gap-1">
      <span className="text-3xl font-black text-relay-700">{total.toFixed(1)}</span>
      <span className="text-sm font-semibold text-slate-500">/ 100</span>
    </div>
  )
}

/**
 * Fully transparent score breakdown. Falls back to the persisted numeric
 * columns when a match was stored by an older engine version.
 */
export function ScoreBreakdown({
  detail,
  fallback,
}: {
  detail: StoredScoreDetail | null
  fallback: Record<ScoreDimension, number>
}) {
  const components: ScoreComponent[] =
    detail?.components && detail.components.length > 0
      ? detail.components
      : (Object.keys(SCORE_WEIGHTS) as ScoreDimension[]).map((dimension) => ({
          dimension,
          label: SCORE_LABELS[dimension],
          score: fallback[dimension] ?? 0,
          max: SCORE_WEIGHTS[dimension],
          detail: '内訳が保存されていません（再マッチで生成されます）',
          signals: [],
        }))

  return (
    <div className="space-y-4">
      {components.map((component) => (
        <div key={component.dimension}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold text-slate-800">{component.label}</span>
            <span className="text-sm font-semibold text-slate-600">
              {Number(component.score).toFixed(1)} / {component.max}
            </span>
          </div>
          <div className="mt-1.5">
            <Bar score={Number(component.score)} max={component.max} />
          </div>
          <p className="mt-1 text-xs leading-5 text-slate-500">{component.detail}</p>
          {component.signals?.length ? (
            <ul className="mt-1 flex flex-wrap gap-1">
              {component.signals.map((signal) => (
                <li key={signal} className="badge bg-slate-100 text-slate-600">
                  {SIGNAL_LABEL[signal] ?? signal}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}

      {detail?.engine ? (
        <p className="border-t border-slate-100 pt-3 text-xs text-slate-400">
          エンジン: {detail.engine} v{detail.engine_version}
          {detail.raw_signals?.distance_m != null
            ? ` / 実距離 ${(detail.raw_signals.distance_m / 1000).toFixed(1)}km`
            : ''}
          {detail.raw_signals?.asset_similarity != null
            ? ` / 資産cos類似度 ${detail.raw_signals.asset_similarity.toFixed(3)}`
            : ''}
          {detail.raw_signals?.service_similarity != null
            ? ` / サービスcos類似度 ${detail.raw_signals.service_similarity.toFixed(3)}`
            : ''}
        </p>
      ) : null}
    </div>
  )
}
