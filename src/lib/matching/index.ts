import { RulesMatchingEngine } from './rules-engine'
import type { MatchingEngine } from './types'

export * from './types'
export * from './semantic'
export * from './geo'
export * from './text'
export { RulesMatchingEngine } from './rules-engine'

/**
 * Single place where the active engine is selected. Swapping in a different
 * strategy (e.g. a pure-vector or LLM re-ranking engine) only requires
 * returning another `MatchingEngine` implementation here — no UI change.
 */
export function getMatchingEngine(): MatchingEngine {
  return new RulesMatchingEngine()
}
