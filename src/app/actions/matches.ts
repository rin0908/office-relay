'use server'

import { revalidatePath } from 'next/cache'
import type { Json } from '@/lib/database.types'
import { getMatchingEngine, type MatchCandidate } from '@/lib/matching'
import { requireSessionContext } from '@/lib/session'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import type { ActionState } from './auth'

export interface GenerateMatchesState extends ActionState {
  candidates?: number
  saved?: number
}

/**
 * Golden Path step 3: Match.
 *
 * Candidates (with pgvector similarity and PostGIS distance) come from the
 * database, scoring happens in the swappable TypeScript engine, and the
 * resulting scores + explanations are persisted through `save_matches`.
 */
export async function generateMatchesAction(): Promise<GenerateMatchesState> {
  const { org } = await requireSessionContext()
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.rpc('match_candidates', { p_org_id: org.id })
  if (error) return { error: `マッチ候補を取得できませんでした：${error.message}` }

  const candidates = (data ?? []) as MatchCandidate[]
  if (candidates.length === 0) {
    return { candidates: 0, saved: 0, message: 'マッチ候補が見つかりませんでした。' }
  }

  const engine = getMatchingEngine()
  const now = new Date()
  const scored = engine.rank(candidates, now)

  const payload = scored
    .filter((match) => match.totalScore > 0)
    .map((match) => ({
      item_id: match.candidate.item_id,
      need_id: match.candidate.need_id,
      donor_org_id: match.candidate.donor_org_id,
      recipient_org_id: match.candidate.recipient_org_id,
      asset_score: match.assetScore,
      quantity_score: match.quantityScore,
      service_score: match.serviceScore,
      location_score: match.locationScore,
      urgency_score: match.urgencyScore,
      total_score: match.totalScore,
      score_detail: {
        engine: match.engine,
        engine_version: match.engineVersion,
        generated_at: now.toISOString(),
        components: match.components,
        raw_signals: {
          asset_similarity: match.candidate.asset_similarity,
          service_similarity: match.candidate.service_similarity,
          distance_m: match.candidate.distance_m,
        },
      },
    }))

  const { data: saved, error: saveError } = await supabase.rpc('save_matches', {
    p_matches: payload as unknown as Json,
  })
  if (saveError) return { error: `マッチを保存できませんでした：${saveError.message}` }

  revalidatePath('/matches')
  revalidatePath('/dashboard')
  return {
    candidates: candidates.length,
    saved: saved ?? 0,
    message: `${candidates.length}件の候補から${saved ?? 0}件のマッチを算出しました。`,
  }
}

export async function acceptMatchAction(matchId: string): Promise<ActionState> {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('accept_match', { p_match_id: matchId })
  if (error) return { error: `承認できませんでした：${error.message}` }

  revalidatePath('/matches')
  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/transfers')
  revalidatePath('/dashboard')
  return { message: '承認しました。' }
}

export async function rejectMatchAction(matchId: string): Promise<ActionState> {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('reject_match', { p_match_id: matchId })
  if (error) return { error: `見送りにできませんでした：${error.message}` }

  revalidatePath('/matches')
  revalidatePath(`/matches/${matchId}`)
  return { message: '見送りにしました。' }
}

export async function updateTransferStatusAction(
  transferId: string,
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
): Promise<ActionState> {
  await requireSessionContext()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('transfers').update({ status }).eq('id', transferId)
  if (error) return { error: `更新できませんでした：${error.message}` }

  revalidatePath('/transfers')
  revalidatePath('/dashboard')
  return { message: '受け渡しステータスを更新しました。' }
}
