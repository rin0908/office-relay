// OFFICE RELAY : Devin Connector Factory
//
// Turns a supplier's CSV / API sample into a real integration task for Devin:
// it creates a Devin session through the official Devin API and records the
// session URL (and later the Pull Request URL) on the connector job.
//
// The Devin API key lives ONLY here, as a Supabase Edge Function secret
// (`supabase secrets set DEVIN_API_KEY=...`). It is never exposed to the
// browser, and no service_role key is used: the function forwards the caller's
// JWT so RLS and organization membership still apply.
//
// If DEVIN_API_KEY is not configured the job fails with an explicit message —
// this integration is never simulated.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const DEVIN_API_BASE = Deno.env.get('DEVIN_API_BASE') ?? 'https://api.devin.ai/v1'
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  })
}

function buildPrompt(input: {
  supplierName: string
  sourceKind: string
  sourceSample: string
  repo: string
}): string {
  return [
    `OFFICE RELAY のサプライヤー連携コネクタを実装してください。`,
    ``,
    `対象サプライヤー: ${input.supplierName}`,
    `入力形式: ${input.sourceKind === 'csv' ? 'CSV' : 'API スペック'}`,
    `対象リポジトリ: ${input.repo}`,
    ``,
    `サンプルデータ:`,
    '```',
    input.sourceSample.slice(0, 4000),
    '```',
    ``,
    `要件:`,
    `1. サンプルの各列 / フィールドを OFFICE RELAY の items テーブル`,
    `   (title, description, category, quantity, condition, public_location, pickup_deadline)`,
    `   にマッピングする TypeScript のコネクタを src/lib/connectors/ に追加する。`,
    `2. カテゴリは src/lib/format.ts の CATEGORIES に正規化する。`,
    `3. Vitest でマッピングの単体テストを追加する。`,
    `4. npm run lint / npm run typecheck / npm test が通ることを確認する。`,
    `5. Pull Request を作成し、マッピング仕様を説明する。`,
  ].join('\n')
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return json({ error: 'missing Authorization header' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  )

  let jobId: string | undefined
  try {
    const body = await request.json()
    jobId = body?.job_id
  } catch {
    return json({ error: 'invalid JSON body' }, 400)
  }
  if (!jobId) return json({ error: 'job_id is required' }, 400)

  const { data: job, error: jobError } = await supabase
    .from('connector_jobs')
    .select('id, supplier_name, source_kind, source_sample')
    .eq('id', jobId)
    .maybeSingle()

  if (jobError || !job) return json({ error: 'connector job not found or not permitted' }, 404)

  const apiKey = Deno.env.get('DEVIN_API_KEY')
  if (!apiKey) {
    await supabase.rpc('update_connector_job', {
      p_job_id: jobId,
      p_status: 'failed',
      p_error:
        'DEVIN_API_KEY が Edge Function のシークレットに設定されていないため、Devin セッションを作成できません。`supabase secrets set DEVIN_API_KEY=...` を実行してください。',
      p_log_entry: 'DEVIN_API_KEY 未設定のため中止しました（ダミー処理は行いません）。',
    })
    return json({ error: 'DEVIN_API_KEY is not configured' }, 503)
  }

  await supabase.rpc('update_connector_job', {
    p_job_id: jobId,
    p_status: 'analyzing',
    p_log_entry: 'サンプルデータを解析し、Devin セッションを作成します。',
  })

  const prompt = buildPrompt({
    supplierName: job.supplier_name,
    sourceKind: job.source_kind,
    sourceSample: job.source_sample,
    repo: Deno.env.get('CONNECTOR_FACTORY_REPO') ?? 'rin0908/office-relay',
  })

  try {
    const response = await fetch(`${DEVIN_API_BASE}/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        title: `OFFICE RELAY connector: ${job.supplier_name}`,
        idempotent: true,
      }),
    })

    const payload = await response.json().catch(() => ({}))

    if (!response.ok) {
      await supabase.rpc('update_connector_job', {
        p_job_id: jobId,
        p_status: 'failed',
        p_error: `Devin API error ${response.status}: ${JSON.stringify(payload).slice(0, 500)}`,
        p_log_entry: 'Devin セッションの作成に失敗しました。',
      })
      return json({ error: 'devin api error', status: response.status, payload }, 502)
    }

    const sessionId: string | undefined = payload.session_id ?? payload.id
    const sessionUrl: string | undefined = payload.url ?? payload.session_url

    await supabase.rpc('update_connector_job', {
      p_job_id: jobId,
      p_status: 'building',
      p_devin_session_id: sessionId ?? null,
      p_devin_session_url: sessionUrl ?? null,
      p_log_entry: `Devin セッションを作成しました${sessionId ? `（${sessionId}）` : ''}。実装と PR 作成を進めます。`,
    })

    return json({ ok: true, session_id: sessionId, session_url: sessionUrl })
  } catch (error) {
    await supabase.rpc('update_connector_job', {
      p_job_id: jobId,
      p_status: 'failed',
      p_error: `Devin API request failed: ${(error as Error).message}`,
      p_log_entry: 'Devin API への接続に失敗しました。',
    })
    return json({ error: (error as Error).message }, 502)
  }
})
