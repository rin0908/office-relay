'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { signInAction, signUpAction, type ActionState } from '@/app/actions/auth'
import { SubmitButton } from '@/components/submit-button'

const initialState: ActionState = {}

export function AuthForm({ mode, redirectTo }: { mode: 'signin' | 'signup'; redirectTo: string }) {
  const action = mode === 'signup' ? signUpAction : signInAction
  const [state, formAction] = useActionState(action, initialState)

  return (
    <>
      <h1 className="text-xl font-bold text-slate-900">
        {mode === 'signup' ? 'アカウントを作成' : 'サインイン'}
      </h1>
      <p className="mt-1 text-sm text-slate-600">
        {mode === 'signup'
          ? '企業・スタートアップのどちらでもご利用いただけます。'
          : 'メールアドレスとパスワードでサインインしてください。'}
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="redirect" value={redirectTo} />
        <div>
          <label className="label" htmlFor="email">
            メールアドレス
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="label" htmlFor="password">
            パスワード
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            minLength={8}
            className="input"
            placeholder="8文字以上"
          />
        </div>

        {state?.error ? (
          <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-500">
            {state.error}
          </p>
        ) : null}
        {state?.message ? (
          <p className="rounded-lg bg-accent-100 px-3 py-2 text-sm text-accent-500">
            {state.message}
          </p>
        ) : null}

        <SubmitButton className="btn-primary w-full">
          {mode === 'signup' ? 'アカウントを作成する' : 'サインイン'}
        </SubmitButton>
      </form>

      <p className="mt-4 text-sm text-slate-600">
        {mode === 'signup' ? (
          <>
            すでにアカウントをお持ちですか？{' '}
            <Link href="/login" className="font-semibold text-relay-600 hover:underline">
              サインイン
            </Link>
          </>
        ) : (
          <>
            アカウントをお持ちでない場合{' '}
            <Link href="/login?mode=signup" className="font-semibold text-relay-600 hover:underline">
              新規登録
            </Link>
          </>
        )}
      </p>
    </>
  )
}
