'use client'

import { useActionState } from 'react'
import { createConnectorJobAction, type ConnectorJobState } from '@/app/actions/connector-factory'
import { SubmitButton } from '@/components/submit-button'

const SAMPLE = `asset_name,qty,cond,area,deadline
木製デスク W1200,20,B,渋谷区,2026-08-17 18:00
メッシュチェア,24,A,渋谷区,2026-08-17 18:00`

export function ConnectorJobForm() {
  const [state, formAction] = useActionState<ConnectorJobState, FormData>(
    createConnectorJobAction,
    {},
  )

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="supplier_name">
          サプライヤー名
        </label>
        <input
          id="supplier_name"
          name="supplier_name"
          required
          className="input"
          placeholder="例）オフィスファニチャー株式会社"
        />
      </div>
      <div>
        <label className="label" htmlFor="source_kind">
          入力形式
        </label>
        <select id="source_kind" name="source_kind" className="input" defaultValue="csv">
          <option value="csv">CSV</option>
          <option value="api_spec">API スペック</option>
        </select>
      </div>
      <div>
        <label className="label" htmlFor="source_sample">
          サンプルデータ
        </label>
        <textarea
          id="source_sample"
          name="source_sample"
          rows={7}
          required
          className="input font-mono text-xs"
          defaultValue={SAMPLE}
        />
        <p className="hint">この内容が Devin への指示に含まれ、コネクタ実装と PR 作成が行われます。</p>
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-500">{state.message}</p>
      ) : null}

      <SubmitButton className="btn-primary w-full" pendingLabel="Devin セッションを作成中…">
        Devin にコネクタ実装を依頼する
      </SubmitButton>
    </form>
  )
}
