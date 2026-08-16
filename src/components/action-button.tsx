'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { ActionState } from '@/app/actions/auth'

/**
 * Generic button for a Server Action that takes no form data.
 * Shows a pending state and surfaces the action's error message.
 */
export function ActionButton({
  action,
  children,
  className = 'btn-primary',
  pendingLabel = '処理中…',
  confirmMessage,
}: {
  action: () => Promise<ActionState>
  children: React.ReactNode
  className?: string
  pendingLabel?: string
  confirmMessage?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [refreshRequested, requestRefresh] = useState(0)

  useEffect(() => {
    if (refreshRequested > 0) router.refresh()
  }, [refreshRequested, router])

  function run() {
    if (confirmMessage && !window.confirm(confirmMessage)) return
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) setError(result.error)
      else requestRefresh((count) => count + 1)
    })
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={run} disabled={pending} className={className}>
        {pending ? (
          <>
            <span className="size-3.5 animate-spin rounded-full border-2 border-current/30 border-t-current" />
            {pendingLabel}
          </>
        ) : (
          children
        )}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-danger-500">
          {error}
        </span>
      ) : null}
    </span>
  )
}
