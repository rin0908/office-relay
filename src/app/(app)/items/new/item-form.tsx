'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { createItemAction, type CreateItemState } from '@/app/actions/items'
import { PhotoUploader } from '@/components/photo-uploader'
import { SubmitButton } from '@/components/submit-button'
import type { Area } from '@/lib/areas'

interface Option {
  value: string
  label: string
}

export function ItemForm({
  orgId,
  areas,
  defaultAreaValue,
  categories,
  conditions,
}: {
  orgId: string
  areas: Area[]
  defaultAreaValue: string
  categories: Option[]
  conditions: Option[]
}) {
  const [state, formAction] = useActionState<CreateItemState, FormData>(createItemAction, {})

  if (state?.itemId) {
    return (
      <div className="space-y-5">
        <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm font-semibold text-accent-500">
          資産を登録しました。続けて写真をアップロードしてください。
        </p>
        <PhotoUploader
          orgId={orgId}
          itemId={state.itemId}
          existingCount={0}
          doneHref={`/items/${state.itemId}`}
        />
        <Link
          href={`/items/${state.itemId}`}
          className="block text-sm font-semibold text-relay-600 hover:underline"
        >
          登録した資産を確認する →
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label className="label" htmlFor="title">
          資産名
        </label>
        <input
          id="title"
          name="title"
          required
          className="input"
          placeholder="例）木製オフィスデスク（W1200）"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          説明
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          className="input"
          placeholder="例）オフィス移転で不要になりました。天板に軽い使用感はありますが問題なく使用できます。"
        />
        <p className="hint">この文章から意味ベクトルを生成し、ニーズとの類似度を計算します。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="category">
            カテゴリ
          </label>
          <select id="category" name="category" required className="input" defaultValue="">
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
          <label className="label" htmlFor="quantity">
            数量
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            min={1}
            defaultValue={1}
            required
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="condition">
            状態
          </label>
          <select id="condition" name="condition" className="input" defaultValue="good">
            {conditions.map((condition) => (
              <option key={condition.value} value={condition.value}>
                {condition.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="area">
            公開エリア
          </label>
          <select id="area" name="area" className="input" defaultValue={defaultAreaValue}>
            {areas.map((area) => (
              <option key={area.value} value={area.value}>
                {area.label}
              </option>
            ))}
          </select>
          <p className="hint">PostGIS の距離計算に使用します。</p>
        </div>
        <div>
          <label className="label" htmlFor="pickup_deadline">
            引き取り期限
          </label>
          <input
            id="pickup_deadline"
            name="pickup_deadline"
            type="datetime-local"
            className="input"
          />
          <p className="hint">期限が近いほど緊急度スコアが高くなります。</p>
        </div>
      </div>

      <fieldset className="rounded-lg bg-slate-50 p-4">
        <legend className="px-1 text-sm font-bold text-slate-700">
          非公開情報（マッチ成立後にのみ相手に開示）
        </legend>
        <div className="mt-2 space-y-4">
          <div>
            <label className="label" htmlFor="exact_pickup_address">
              正確な引き取り住所
            </label>
            <input
              id="exact_pickup_address"
              name="exact_pickup_address"
              className="input"
              placeholder="例）東京都渋谷区神南1-2-3 リレービル7F"
            />
          </div>
          <div>
            <label className="label" htmlFor="contact_note">
              引き取り時の連絡事項
            </label>
            <input
              id="contact_note"
              name="contact_note"
              className="input"
              placeholder="例）搬入口は建物裏。総務部 山田（090-xxxx-xxxx）"
            />
          </div>
        </div>
      </fieldset>

      {state?.error ? (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
          {state.error}
        </p>
      ) : null}

      <SubmitButton className="btn-primary w-full" pendingLabel="登録中…">
        登録して写真を追加する
      </SubmitButton>
    </form>
  )
}
