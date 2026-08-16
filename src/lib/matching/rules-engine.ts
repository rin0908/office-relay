import { locationFit } from './geo'
import { normalizeSimilarity } from './semantic'
import { bestPairSimilarity, clamp01, diceSimilarity } from './text'
import {
  SCORE_LABELS,
  SCORE_WEIGHTS,
  type MatchCandidate,
  type MatchingEngine,
  type ScoreComponent,
  type ScoredMatch,
} from './types'

const HOUR_MS = 60 * 60 * 1000

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function component(
  dimension: ScoreComponent['dimension'],
  ratio: number,
  detail: string,
  signals: string[],
): ScoreComponent {
  const max = SCORE_WEIGHTS[dimension]
  return {
    dimension,
    label: SCORE_LABELS[dimension],
    score: round1(clamp01(ratio) * max),
    max,
    detail,
    signals,
  }
}

/**
 * Rules-based matching engine (deterministic, explainable).
 *
 * Every score is computed from live data: lexical similarity, pgvector cosine
 * similarity, quantities, PostGIS distance and pickup deadlines. Nothing is
 * hardcoded per organization or per item.
 */
export class RulesMatchingEngine implements MatchingEngine {
  readonly name = 'rules-v1'
  readonly version = '1.0.0'

  score(candidate: MatchCandidate, now: Date = new Date()): ScoredMatch {
    const components = [
      this.assetFit(candidate),
      this.quantityFit(candidate),
      this.serviceFit(candidate),
      this.locationFit(candidate),
      this.urgencyFit(candidate, now),
    ]

    const byDimension = (dimension: ScoreComponent['dimension']) =>
      components.find((c) => c.dimension === dimension)?.score ?? 0

    const totalScore = round1(components.reduce((sum, c) => sum + c.score, 0))

    return {
      candidate,
      components,
      assetScore: byDimension('asset_fit'),
      quantityScore: byDimension('quantity_fit'),
      serviceScore: byDimension('service_fit'),
      locationScore: byDimension('location_fit'),
      urgencyScore: byDimension('urgency_fit'),
      totalScore,
      engine: this.name,
      engineVersion: this.version,
    }
  }

  rank(candidates: MatchCandidate[], now: Date = new Date()): ScoredMatch[] {
    return candidates
      .map((candidate) => this.score(candidate, now))
      .sort((a, b) => b.totalScore - a.totalScore)
  }

  /** 40pt: category + lexical text + pgvector semantic similarity */
  private assetFit(candidate: MatchCandidate): ScoreComponent {
    const sameCategory = candidate.item_category === candidate.need_category
    const lexical = Math.max(
      diceSimilarity(candidate.item_title, candidate.need_title),
      diceSimilarity(
        `${candidate.item_title} ${candidate.item_description ?? ''}`,
        `${candidate.need_title} ${candidate.need_description ?? ''}`,
      ),
    )
    const semantic = normalizeSimilarity(candidate.asset_similarity)
    const signals = ['lexical']
    if (sameCategory) signals.push('category')

    let ratio: number
    let detail: string
    if (semantic === null) {
      ratio = (sameCategory ? 0.5 : 0) + 0.5 * lexical
      detail = `カテゴリ${sameCategory ? '一致' : '不一致'} / テキスト類似度 ${(lexical * 100).toFixed(0)}%`
    } else {
      signals.push('pgvector')
      ratio = (sameCategory ? 0.35 : 0) + 0.25 * lexical + 0.4 * semantic
      detail = `カテゴリ${sameCategory ? '一致' : '不一致'} / テキスト類似度 ${(
        lexical * 100
      ).toFixed(0)}% / 意味類似度 ${(semantic * 100).toFixed(0)}%（pgvector）`
    }

    return component('asset_fit', ratio, detail, signals)
  }

  /** 20pt: how much of the requested quantity can be covered */
  private quantityFit(candidate: MatchCandidate): ScoreComponent {
    const need = candidate.need_quantity
    const available = candidate.item_quantity
    if (need <= 0) {
      return component('quantity_fit', 0, '必要数量が未設定です', [])
    }
    const coverage = clamp01(available / need)
    // Full coverage is ideal; partial coverage still has value but is damped.
    const ratio = coverage >= 1 ? 1 : coverage * 0.9
    return component(
      'quantity_fit',
      ratio,
      `提供 ${available} / 必要 ${need}（充足率 ${(coverage * 100).toFixed(0)}%）`,
      ['quantity'],
    )
  }

  /** 20pt: donor's Service Want vs recipient's Service Offer (bi-directional value) */
  private serviceFit(candidate: MatchCandidate): ScoreComponent {
    const wants = candidate.donor_service_wants ?? []
    const offers = candidate.recipient_service_offers ?? []
    if (wants.length === 0 || offers.length === 0) {
      return component(
        'service_fit',
        0,
        wants.length === 0
          ? '提供企業がサービス希望を登録していません'
          : 'スタートアップがサービス提供を登録していません',
        [],
      )
    }

    const lexical = bestPairSimilarity(wants, offers)
    const semantic = normalizeSimilarity(candidate.service_similarity)
    const signals = ['lexical']
    let ratio: number
    let detail: string

    if (semantic === null) {
      ratio = lexical
      detail = `サービス希望「${wants[0]}」× 提供「${offers[0]}」テキスト類似度 ${(
        lexical * 100
      ).toFixed(0)}%`
    } else {
      signals.push('pgvector')
      ratio = Math.max(semantic, lexical * 0.8)
      detail = `サービス希望 × サービス提供 意味類似度 ${(semantic * 100).toFixed(
        0,
      )}%（pgvector） / テキスト類似度 ${(lexical * 100).toFixed(0)}%`
    }

    return component('service_fit', ratio, detail, signals)
  }

  /** 10pt: PostGIS distance, falling back to public location text */
  private locationFit(candidate: MatchCandidate): ScoreComponent {
    const fit = locationFit(
      candidate.distance_m,
      candidate.item_public_location,
      candidate.need_public_location,
    )
    return component('location_fit', fit.ratio, fit.detail, fit.signals)
  }

  /** 10pt: pickup deadline feasibility & urgency */
  private urgencyFit(candidate: MatchCandidate, now: Date): ScoreComponent {
    const deadline = candidate.item_pickup_deadline
      ? new Date(candidate.item_pickup_deadline)
      : null
    if (!deadline) {
      return component('urgency_fit', 0.3, '引き取り期限が未設定（緊急度低）', ['temporal'])
    }

    const hoursLeft = (deadline.getTime() - now.getTime()) / HOUR_MS
    if (hoursLeft <= 0) {
      return component('urgency_fit', 0, '引き取り期限を超過しています', ['temporal'])
    }

    let ratio: number
    if (hoursLeft <= 24) ratio = 1
    else if (hoursLeft <= 72) ratio = 0.85
    else if (hoursLeft <= 168) ratio = 0.6
    else ratio = 0.4

    const signals = ['temporal']
    let detail = `引き取り期限まで約${Math.round(hoursLeft)}時間`

    const neededBy = candidate.need_needed_by ? new Date(candidate.need_needed_by) : null
    if (neededBy && deadline.getTime() > neededBy.getTime()) {
      ratio *= 0.5
      detail += ' / 希望時期より遅いため減点'
      signals.push('need_deadline')
    }

    return component('urgency_fit', ratio, detail, signals)
  }
}
