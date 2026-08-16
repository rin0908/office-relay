'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Table = 'matches' | 'transfers' | 'items' | 'needs' | 'connector_jobs'

/**
 * Supabase Realtime: both sides of a relay see state changes without a reload.
 * Postgres changes are filtered by RLS, so a client only ever receives rows it
 * is allowed to read.
 */
export function RealtimeRefresher({
  tables,
  label = 'リアルタイム更新',
}: {
  tables: Table[]
  label?: string
}) {
  const router = useRouter()
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel(`office-relay:${tables.join('-')}`)

    for (const table of tables) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        setLastEvent(
          `${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' })} ${table} ${payload.eventType}`,
        )
        router.refresh()
      })
    }

    channel.subscribe((status) => {
      setConnected(status === 'SUBSCRIBED')
    })

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [router, tables])

  return (
    <div className="flex items-center gap-2 text-xs text-slate-500">
      <span
        aria-hidden
        className={`inline-block size-2 rounded-full ${
          connected ? 'bg-accent-500' : 'bg-slate-300'
        }`}
      />
      <span>
        {label}: {connected ? '接続中' : '接続待ち'}
        {lastEvent ? ` — 最終受信 ${lastEvent}` : ''}
      </span>
    </div>
  )
}
