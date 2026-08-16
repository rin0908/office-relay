import { clamp01 } from './text'

/**
 * Calibration of raw pgvector cosine similarity.
 *
 * The embedding model used (`gte-small`, executed inside a Supabase Edge
 * Function) produces cosine similarities in a narrow band for short Japanese
 * business phrases: measured on this project's demo corpus, unrelated pairs
 * sit around 0.82-0.87 while genuinely related pairs reach 0.93+.
 * Consuming the raw value would make every pair look "similar", so we rescale
 * the useful band to 0..1. The bounds are constants (not magic numbers inside
 * the scoring code) so they can be re-calibrated if the model changes.
 */
export const SEMANTIC_FLOOR = 0.84
export const SEMANTIC_CEILING = 0.95

export function normalizeSimilarity(raw: number | null | undefined): number | null {
  if (raw === null || raw === undefined || Number.isNaN(raw)) return null
  return clamp01((raw - SEMANTIC_FLOOR) / (SEMANTIC_CEILING - SEMANTIC_FLOOR))
}
