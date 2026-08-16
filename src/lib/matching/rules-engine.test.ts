import { describe, expect, it } from 'vitest'
import { RulesMatchingEngine } from './rules-engine'
import { normalizeSimilarity, SEMANTIC_CEILING, SEMANTIC_FLOOR } from './semantic'
import { diceSimilarity } from './text'
import type { MatchCandidate } from './types'

const NOW = new Date('2026-08-16T09:00:00+09:00')

function candidate(overrides: Partial<MatchCandidate> = {}): MatchCandidate {
  return {
    item_id: 'item-1',
    need_id: 'need-1',
    donor_org_id: 'donor-1',
    recipient_org_id: 'startup-1',
    item_title: 'メッシュチェア（可動式）',
    item_description: '会議室で使用していたメッシュ張りのオフィスチェアです。24脚あります。',
    item_category: 'chair',
    item_quantity: 24,
    item_public_location: '東京都渋谷区',
    item_pickup_deadline: '2026-08-17T18:00:00+09:00',
    need_title: 'オフィスチェア',
    need_description: '長時間の開発作業に耐えるオフィスチェアを10脚探しています。',
    need_category: 'chair',
    need_quantity: 10,
    need_public_location: '東京都渋谷区 恵比寿',
    need_needed_by: '2026-08-20T20:00:00+09:00',
    asset_similarity: 0.93,
    service_similarity: 0.935,
    donor_service_wants: ['生成AI社内研修'],
    recipient_service_offers: ['生成AI社内研修', 'AI業務自動化の実装支援', 'Web開発'],
    distance_m: 1800,
    ...overrides,
  }
}

const engine = new RulesMatchingEngine()

describe('RulesMatchingEngine', () => {
  it('keeps every dimension inside its documented weight and sums to the total', () => {
    const scored = engine.score(candidate(), NOW)
    const weights = { asset_fit: 40, quantity_fit: 20, service_fit: 20, location_fit: 10, urgency_fit: 10 }
    for (const component of scored.components) {
      expect(component.max).toBe(weights[component.dimension])
      expect(component.score).toBeGreaterThanOrEqual(0)
      expect(component.score).toBeLessThanOrEqual(component.max)
    }
    const sum = scored.components.reduce((total, c) => total + c.score, 0)
    expect(scored.totalScore).toBeCloseTo(Math.round(sum * 10) / 10, 5)
    expect(scored.totalScore).toBeLessThanOrEqual(100)
  })

  it('scores the demo scenario highly from live data only', () => {
    const scored = engine.score(candidate(), NOW)
    expect(scored.totalScore).toBeGreaterThan(75)
    expect(scored.quantityScore).toBe(20)
    expect(scored.engine).toBe('rules-v1')
  })

  it('scores an unrelated asset far lower (no hardcoded scores)', () => {
    const scored = engine.score(
      candidate({
        item_title: '大型冷蔵庫（オフィス用）',
        item_description: '休憩スペースで使用していた6ドア冷蔵庫です。',
        item_category: 'appliance',
        item_quantity: 1,
        asset_similarity: 0.85,
        service_similarity: null,
        donor_service_wants: [],
        recipient_service_offers: [],
        distance_m: 450_000,
        item_pickup_deadline: '2026-09-30T18:00:00+09:00',
      }),
      NOW,
    )
    expect(scored.totalScore).toBeLessThan(35)
    expect(scored.serviceScore).toBe(0)
  })

  it('damps partial quantity coverage', () => {
    const full = engine.score(candidate({ item_quantity: 10, need_quantity: 10 }), NOW)
    const half = engine.score(candidate({ item_quantity: 5, need_quantity: 10 }), NOW)
    expect(full.quantityScore).toBe(20)
    expect(half.quantityScore).toBeCloseTo(9, 1)
    expect(half.quantityScore).toBeLessThan(full.quantityScore)
  })

  it('gives no urgency points once the pickup deadline has passed', () => {
    const scored = engine.score(
      candidate({ item_pickup_deadline: '2026-08-15T18:00:00+09:00' }),
      NOW,
    )
    expect(scored.urgencyScore).toBe(0)
    expect(
      scored.components.find((c) => c.dimension === 'urgency_fit')?.detail,
    ).toContain('超過')
  })

  it('rewards a deadline within 24h more than one a month away', () => {
    const urgent = engine.score(candidate({ item_pickup_deadline: '2026-08-16T20:00:00+09:00' }), NOW)
    const relaxed = engine.score(
      candidate({
        item_pickup_deadline: '2026-09-16T20:00:00+09:00',
        need_needed_by: '2026-10-01T20:00:00+09:00',
      }),
      NOW,
    )
    expect(urgent.urgencyScore).toBeGreaterThan(relaxed.urgencyScore)
  })

  it('penalises long distances through the PostGIS signal', () => {
    const near = engine.score(candidate({ distance_m: 1200 }), NOW)
    const far = engine.score(candidate({ distance_m: 480_000 }), NOW)
    expect(near.locationScore).toBe(10)
    expect(far.locationScore).toBeLessThan(2)
    expect(
      near.components.find((c) => c.dimension === 'location_fit')?.signals,
    ).toContain('postgis')
  })

  it('falls back to lexical scoring when embeddings are unavailable', () => {
    const scored = engine.score(
      candidate({ asset_similarity: null, service_similarity: null }),
      NOW,
    )
    const asset = scored.components.find((c) => c.dimension === 'asset_fit')
    expect(asset?.signals).not.toContain('pgvector')
    expect(asset?.score).toBeGreaterThan(0)
    expect(scored.totalScore).toBeGreaterThan(50)
  })

  it('uses pgvector as a signal when similarities are present', () => {
    const scored = engine.score(candidate(), NOW)
    expect(scored.components.find((c) => c.dimension === 'asset_fit')?.signals).toContain('pgvector')
    expect(scored.components.find((c) => c.dimension === 'service_fit')?.signals).toContain(
      'pgvector',
    )
  })

  it('reports zero service fit when the donor wants no service', () => {
    const scored = engine.score(
      candidate({ donor_service_wants: [], service_similarity: null }),
      NOW,
    )
    expect(scored.serviceScore).toBe(0)
  })

  it('ranks candidates by total score', () => {
    const ranked = engine.rank(
      [
        candidate({ item_id: 'weak', item_category: 'appliance', item_quantity: 1, asset_similarity: 0.84 }),
        candidate({ item_id: 'strong' }),
      ],
      NOW,
    )
    expect(ranked.map((r) => r.candidate.item_id)).toEqual(['strong', 'weak'])
  })
})

describe('semantic calibration', () => {
  it('maps the gte-small similarity band onto 0..1', () => {
    expect(normalizeSimilarity(null)).toBeNull()
    expect(normalizeSimilarity(SEMANTIC_FLOOR)).toBe(0)
    expect(normalizeSimilarity(SEMANTIC_CEILING)).toBe(1)
    expect(normalizeSimilarity(0.2)).toBe(0)
    expect(normalizeSimilarity(0.99)).toBe(1)
  })
})

describe('lexical similarity', () => {
  it('is high for Japanese strings sharing character bigrams', () => {
    expect(diceSimilarity('オフィスチェア', 'メッシュチェア')).toBeGreaterThan(0.3)
    expect(diceSimilarity('オフィスチェア', 'オフィスチェア')).toBe(1)
    expect(diceSimilarity('オフィスチェア', '冷蔵庫')).toBe(0)
  })
})
