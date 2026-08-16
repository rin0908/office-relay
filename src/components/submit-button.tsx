'use client'

import { useFormStatus } from 'react-dom'

interface Props {
  children: React.ReactNode
  pendingLabel?: string
  className?: string
}

export function SubmitButton({ children, pendingLabel = '処理中…', className = 'btn-primary' }: Props) {
  const { pending } = useFormStatus()
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? (
        <>
          <span className="size-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </button>
  )
}
