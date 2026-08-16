import { diceSimilarity } from './text'

export interface LocationFit {
  ratio: number
  detail: string
  signals: string[]
}

const DISTANCE_BANDS: Array<{ maxKm: number; ratio: number }> = [
  { maxKm: 3, ratio: 1 },
  { maxKm: 10, ratio: 0.85 },
  { maxKm: 30, ratio: 0.6 },
  { maxKm: 100, ratio: 0.3 },
  { maxKm: 300, ratio: 0.1 },
]

export function formatDistance(distanceM: number): string {
  if (distanceM < 1000) return `${Math.round(distanceM)}m`
  return `${(distanceM / 1000).toFixed(1)}km`
}

/**
 * Geographic feasibility. Uses the PostGIS distance when both parties have
 * coordinates, and falls back to public (coarse) location text similarity.
 */
export function locationFit(
  distanceM: number | null,
  itemPublicLocation: string | null,
  needPublicLocation: string | null,
): LocationFit {
  if (distanceM !== null && distanceM !== undefined && !Number.isNaN(distanceM)) {
    const km = distanceM / 1000
    const band = DISTANCE_BANDS.find((b) => km <= b.maxKm)
    const ratio = band ? band.ratio : 0
    return {
      ratio,
      detail: `PostGIS実測距離 ${formatDistance(distanceM)}`,
      signals: ['postgis'],
    }
  }

  const textSimilarity = diceSimilarity(itemPublicLocation, needPublicLocation)
  if (textSimilarity > 0) {
    return {
      ratio: Math.min(0.7, textSimilarity),
      detail: `座標未登録のため公開エリア文字列で近似（${itemPublicLocation ?? '不明'} / ${
        needPublicLocation ?? '不明'
      }）`,
      signals: ['text'],
    }
  }

  return { ratio: 0, detail: '位置情報が不足しています', signals: [] }
}
