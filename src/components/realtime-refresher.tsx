'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
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
  const [refreshPending, startRefreshTransition] = useTransition()
  const refreshPendingRef = useRef(false)
  const queuedRefreshRef = useRef(false)
  const scheduleRefreshRef = useRef<() => void>(() => {})
  const tablesKey = tables.join(',')

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout> | null = null
    const supabase = createClient()
    const subscribedTables = tablesKey.split(',')
    const channel = supabase.channel(`office-relay:${subscribedTables.join('-')}`)

    function scheduleRefresh() {
      if (!active) return
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        if (refreshPendingRef.current) {
          queuedRefreshRef.current = true
          return
        }
        refreshPendingRef.current = true
        startRefreshTransition(() => router.refresh())
      }, 250)
    }

    scheduleRefreshRef.current = scheduleRefresh

    for (const table of subscribedTables as Table[]) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (!active) return
        setLastEvent(
          `${new Date().toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo' })} ${table} ${payload.eventType}`,
        )
        if (refreshPendingRef.current) queuedRefreshRef.current = true
        else scheduleRefresh()
      })
    }

    channel.subscribe((status) => {
      if (!active) return
      setConnected(status === 'SUBSCRIBED')
    })

    return () => {
      active = false
      if (timer) clearTimeout(timer)
      if (scheduleRefreshRef.current === scheduleRefresh) scheduleRefreshRef.current = () => {}
      void supabase.removeChannel(channel)
    }
  }, [router, startRefreshTransition, tablesKey])

  useEffect(() => {
    refreshPendingRef.current = refreshPending
    if (!refreshPending && queuedRefreshRef.current) {
      queuedRefreshRef.current = false
      scheduleRefreshRef.current()
    }
  }, [refreshPending])

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
