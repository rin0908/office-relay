/**
 * Matching domain types.
 *
 * The matching engine is intentionally decoupled from React components and
 * from the database access layer: `MatchCandidate` rows come from the
 * `match_candidates` Postgres function (pgvector similarity + PostGIS
 * distance are computed in the database), and the engine turns them into
 * transparent, reproducible scores.
 */

export interface MatchCandidate {
  item_id: string
  need_id: string
  donor_org_id: string
  recipient_org_id: string
  item_title: string
  item_description: string | null
  item_category: string
  item_quantity: number
  item_public_location: string | null
  item_pickup_deadline: string | null
  need_title: string
  need_description: string | null
  need_category: string
  need_quantity: number
  need_public_location: string | null
  need_needed_by: string | null
  /** cosine similarity (0..1) between item and need embeddings, pgvector */
  asset_similarity: number | null
  /** best cosine similarity (0..1) between donor service wants and recipient offers */
  service_similarity: number | null
  donor_service_wants: string[] | null
  recipient_service_offers: string[] | null
  /** metres, PostGIS st_distance on geography(Point, 4326) */
  distance_m: number | null
}

export type ScoreDimension =
  | 'asset_fit'
  | 'quantity_fit'
  | 'service_fit'
  | 'location_fit'
  | 'urgency_fit'

export interface ScoreComponent {
  dimension: ScoreDimension
  /** Japanese label shown in the UI */
  label: string
  score: number
  max: number
  /** how the score was obtained, shown to the user for explainability */
  detail: string
  /** which signals contributed: lexical / semantic / geo / temporal */
  signals: string[]
}

export interface ScoredMatch {
  candidate: MatchCandidate
  components: ScoreComponent[]
  assetScore: number
  quantityScore: number
  serviceScore: number
  locationScore: number
  urgencyScore: number
  totalScore: number
  engine: string
  engineVersion: string
}

export interface MatchingEngine {
  readonly name: string
  readonly version: string
  score(candidate: MatchCandidate, now?: Date): ScoredMatch
  rank(candidates: MatchCandidate[], now?: Date): ScoredMatch[]
}

export const SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  asset_fit: 40,
  quantity_fit: 20,
  service_fit: 20,
  location_fit: 10,
  urgency_fit: 10,
}

export const SCORE_LABELS: Record<ScoreDimension, string> = {
  asset_fit: '資産フィット',
  quantity_fit: '数量フィット',
  service_fit: 'サービス交換フィット',
  location_fit: '距離フィット',
  urgency_fit: '緊急度フィット',
}
