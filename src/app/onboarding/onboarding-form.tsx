'use client'

import { useActionState } from 'react'
import { createOrganizationAction } from '@/app/actions/organizations'
import type { ActionState } from '@/app/actions/auth'
import { SubmitButton } from '@/components/submit-button'
import type { Area } from '@/lib/areas'

export function OnboardingForm({
  areas,
  defaultEmail,
}: {
  areas: Area[]
  defaultEmail: string
}) {
  const [state, formAction] = useActionState<ActionState, FormData>(createOrganizationAction, {})

  return (
    <form action={formAction} className="space-y-5">
      <p className="text-xs text-slate-500">サインイン中: {defaultEmail}</p>

      <div>
        <label className="label" htmlFor="name">
          企業・団体名
        </label>
        <input id="name" name="name" required className="input" placeholder="例）NEXTMOVE株式会社" />
      </div>

      <fieldset>
        <legend className="label">組織種別</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="card flex cursor-pointer items-start gap-3 p-4 hover:border-relay-500">
            <input type="radio" name="org_type" value="donor" required className="mt-1" />
            <span>
              <span className="block text-sm font-bold text-slate-800">提供企業（DONOR）</span>
              <span className="mt-1 block text-xs text-slate-500">
                余剰オフィス資産を提供し、代わりに受けたいサービスを登録します。
              </span>
            </span>
          </label>
          <label className="card flex cursor-pointer items-start gap-3 p-4 hover:border-relay-500">
            <input type="radio" name="org_type" value="startup" className="mt-1" />
            <span>
              <span className="block text-sm font-bold text-slate-800">スタートアップ（STARTUP）</span>
              <span className="mt-1 block text-xs text-slate-500">
                必要な資産と、提供できるサービスを登録します。
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <div>
        <label className="label" htmlFor="area">
          公開エリア
        </label>
        <select id="area" name="area" required className="input" defaultValue="">
          <option value="" disabled>
            選択してください
          </option>
          {areas.map((area) => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </select>
        <p className="hint">距離マッチング（PostGIS）に使用されます。番地は含みません。</p>
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          {state.error}
        </p>
      ) : null}

      <SubmitButton className="btn-primary w-full">この内容で登録する</SubmitButton>
    </form>
  )
}
