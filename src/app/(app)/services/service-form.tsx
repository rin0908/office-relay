'use client'

import { useActionState } from 'react'
import type { ActionState } from '@/app/actions/auth'
import { createServiceOfferAction, createServiceWantAction } from '@/app/actions/services'
import { SubmitButton } from '@/components/submit-button'

export function ServiceForm({ kind }: { kind: 'offer' | 'want' }) {
  const action = kind === 'offer' ? createServiceOfferAction : createServiceWantAction
  const [state, formAction] = useActionState<ActionState, FormData>(action, {})
  const prefix = kind === 'offer' ? 'offer' : 'want'

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor={`${prefix}-title`}>
          タイトル
        </label>
        <input
          id={`${prefix}-title`}
          name="title"
          required
          className="input"
          placeholder={kind === 'offer' ? '例）生成AI社内研修' : '例）生成AI社内研修を受けたい'}
        />
      </div>
      <div>
        <label className="label" htmlFor={`${prefix}-description`}>
          内容
        </label>
        <textarea
          id={`${prefix}-description`}
          name="description"
          rows={3}
          className="input"
          placeholder={
            kind === 'offer'
              ? '例）ChatGPT / Claude の業務活用ワークショップを2時間×2回で提供します。'
              : '例）全社員が生成AIを業務で使えるようにしたい。'
          }
        />
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
        登録する
      </SubmitButton>
    </form>
  )
}
