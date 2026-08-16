'use client'

import { useActionState } from 'react'
import { createNeedAction, type CreateNeedState } from '@/app/actions/needs'
import { SubmitButton } from '@/components/submit-button'
import type { Area } from '@/lib/areas'

export function NeedForm({
  areas,
  defaultAreaValue,
  categories,
}: {
  areas: Area[]
  defaultAreaValue: string
  categories: { value: string; label: string }[]
}) {
  const [state, formAction] = useActionState<CreateNeedState, FormData>(createNeedAction, {})

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="need-title">
          必要な資産
        </label>
        <input
          id="need-title"
          name="title"
          required
          className="input"
          placeholder="例）事務用チェア"
        />
      </div>
      <div>
        <label className="label" htmlFor="need-description">
          説明
        </label>
        <textarea
          id="need-description"
          name="description"
          rows={3}
          className="input"
          placeholder="例）新オフィス開設に伴い、リモート勤務を含む社員用のチェアが必要です。"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="need-category">
            カテゴリ
          </label>
          <select id="need-category" name="category" required className="input" defaultValue="">
            <option value="" disabled>
              選択
            </option>
            {categories.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="need-quantity">
            数量
          </label>
          <input
            id="need-quantity"
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="input"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="need-area">
            公開エリア
          </label>
          <select id="need-area" name="area" className="input" defaultValue={defaultAreaValue}>
            {areas.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="need-needed-by">
            希望時期
          </label>
          <input id="need-needed-by" name="needed_by" type="datetime-local" className="input" />
        </div>
      </div>

      {state?.error ? (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          {state.error}
        </p>
      ) : null}
      {state?.message ? (
        <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-500">{state.message}</p>
      ) : null}

      <SubmitButton className="btn-primary w-full" pendingLabel="登録中…">
        ニーズを登録する
      </SubmitButton>
    </form>
  )
}
