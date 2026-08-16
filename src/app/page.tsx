import Link from 'next/link'
import { getUser } from '@/lib/session'

const STEPS = [
  {
    title: '1. 余剰資産を登録',
    body: '移転・リプレースで不要になったデスク・チェア・モニターを、写真と引き取り期限つきで登録します。正確な住所は公開されません。',
  },
  {
    title: '2. ニーズとサービスを登録',
    body: 'スタートアップは必要な資産と、提供できるサービス（生成AI研修、業務自動化など）を登録します。',
  },
  {
    title: '3. マッチ → 双方承認 → 受け渡し',
    body: '資産・数量・サービス交換・距離・緊急度の5軸でスコアリング。双方が承認した瞬間に受け渡し（Transfer）が自動生成されます。',
  },
]

const SCORES = [
  { label: '資産フィット', max: 40, detail: 'カテゴリ・テキスト・pgvector 意味類似度' },
  { label: '数量フィット', max: 20, detail: '必要数に対する充足率' },
  { label: 'サービス交換フィット', max: 20, detail: '提供企業の「欲しいサービス」× スタートアップの「提供できるサービス」' },
  { label: '距離フィット', max: 10, detail: 'PostGIS による実距離' },
  { label: '緊急度フィット', max: 10, detail: '引き取り期限までの残り時間' },
]

export default async function LandingPage() {
  const user = await getUser()

  return (
    <main>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <span className="text-lg font-black tracking-tight text-relay-700">OFFICE RELAY</span>
          <nav className="flex items-center gap-2">
            {user ? (
              <Link href="/dashboard" className="btn-primary">
                ダッシュボードへ
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn-secondary">
                  サインイン
                </Link>
                <Link href="/login?mode=signup" className="btn-primary">
                  無料で始める
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <section className="bg-gradient-to-b from-white to-relay-50">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
          <p className="badge bg-relay-100 text-relay-700">B2B Circular Resource Relay Platform</p>
          <h1 className="mt-4 text-3xl font-black leading-tight text-slate-900 sm:text-5xl">
            まだ使えるオフィス資産を、
            <br className="hidden sm:block" />
            次に必要な会社へ<span className="text-relay-500">リレー</span>する。
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            OFFICE RELAY は、企業の余剰オフィス資産とスタートアップのニーズを、
            <strong className="font-semibold text-slate-900">
              資産・数量・サービス交換・距離・引き取り期限
            </strong>
            の6要素で結び付けます。単なる中古売買ではなく、モノとサービスの双方向マッチングによって、
            廃棄コストとスタートアップの初期投資を同時に削減します。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={user ? '/dashboard' : '/login?mode=signup'} className="btn-primary px-6 py-3">
              いま登録して資産をリレーする
            </Link>
            <Link href="/login" className="btn-secondary px-6 py-3">
              デモアカウントで見る
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <h2 className="text-2xl font-bold text-slate-900">3ステップで循環が始まります</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <div key={step.title} className="card p-5">
              <h3 className="text-base font-bold text-relay-700">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-2xl font-bold text-slate-900">マッチスコアは100点満点で完全に可視化</h2>
          <p className="mt-2 text-sm text-slate-600">
            スコアは固定値ではなく、登録データから毎回計算されます。内訳と根拠はマッチ詳細画面で確認できます。
          </p>
          <ul className="mt-6 space-y-3">
            {SCORES.map((score) => (
              <li key={score.label} className="card flex flex-wrap items-center gap-3 p-4">
                <span className="w-44 text-sm font-bold text-slate-800">{score.label}</span>
                <span className="badge bg-relay-100 text-relay-700">{score.max}点</span>
                <span className="text-sm text-slate-600">{score.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-8 text-xs text-slate-500 sm:px-6">
          OFFICE RELAY — AIAU Craft Day demo. Supabase (Postgres / Auth / Storage / Realtime /
          pgvector / PostGIS / Edge Functions) 上に構築されています。
        </div>
      </footer>
    </main>
  )
}
