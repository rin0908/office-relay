'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { generateMatchesAction, type GenerateMatchesState } from '@/app/actions/matches'

export function GenerateMatchesButton() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<GenerateMatchesState | null>(null)

  function run() {
    setState(null)
    startTransition(async () => {
      const result = await generateMatchesAction()
      setState(result)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={run} disabled={pending} className="btn-primary">
        {pending ? (
          <>
            <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            マッチを計算中…
          </>
        ) : (
          'マッチを再計算'
        )}
      </button>
      {state?.error ? (
        <span role="alert" className="text-xs text-danger-500">
          {state.error}
        </span>
      ) : null}
      {state?.message ? <span className="text-xs text-slate-500">{state.message}</span> : null}
    </div>
  )
}
