'use server'

import { revalidatePath } from 'next/cache'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from './auth'

export interface ConnectorJobState extends ActionState {
  jobId?: string
}

/**
 * Devin Connector Factory: a supplier's CSV / API sample becomes a real Devin
 * session that implements the connector and opens a Pull Request.
 * The Devin API key lives only in the Supabase Edge Function secrets.
 */
export async function createConnectorJobAction(
  _prev: ConnectorJobState | undefined,
  formData: FormData,
): Promise<ConnectorJobState> {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const supplierName = String(formData.get('supplier_name') ?? '').trim()
  const sourceKind = String(formData.get('source_kind') ?? 'csv')
  const sourceSample = String(formData.get('source_sample') ?? '').trim()

  if (!supplierName) return { error: 'サプライヤー名を入力してください。' }
  if (!sourceSample) return { error: 'CSV または API スペックのサンプルを貼り付けてください。' }
  if (sourceKind !== 'csv' && sourceKind !== 'api_spec') {
    return { error: '入力形式を選択してください。' }
  }

  const { data: job, error } = await supabase
    .from('connector_jobs')
    .insert({
      org_id: org.id,
      supplier_name: supplierName,
      source_kind: sourceKind,
      source_sample: sourceSample,
    })
    .select('id')
    .single()

  if (error || !job) return { error: `ジョブを作成できませんでした：${error?.message}` }

  const { error: invokeError } = await supabase.functions.invoke('connector-factory', {
    body: { job_id: job.id },
  })

  revalidatePath('/connector-factory')

  if (invokeError) {
    return {
      jobId: job.id,
      error: `Devin セッションを開始できませんでした：${invokeError.message}。ジョブのログを確認してください。`,
    }
  }

  return { jobId: job.id, message: 'Devin セッションを作成しました。' }
}
