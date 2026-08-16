/**
 * Lightweight language-agnostic lexical similarity.
 *
 * Japanese text has no whitespace tokenisation, so we use character bigrams
 * (plus ASCII word tokens) and the Sørensen–Dice coefficient. This keeps the
 * rules engine deterministic and dependency-free, and it works without the
 * embedding service being available.
 */

const FULLWIDTH_OFFSET = 0xfee0

export function normalizeText(input: string | null | undefined): string {
  if (!input) return ''
  return input
    .replace(/[\uff01-\uff5e]/g, (c) => String.fromCharCode(c.charCodeAt(0) - FULLWIDTH_OFFSET))
    .replace(/\u3000/g, ' ')
    .toLowerCase()
    .replace(/[()\[\]{}"'`,.、。・:;!?/\\|+*=~^%$#@&<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenSet(input: string | null | undefined): Set<string> {
  const text = normalizeText(input)
  if (!text) return new Set()
  const tokens = new Set<string>()

  for (const word of text.split(' ')) {
    if (word.length >= 2 && /^[a-z0-9]+$/.test(word)) tokens.add(word)
  }

  const compact = text.replace(/ /g, '')
  for (let i = 0; i < compact.length - 1; i += 1) {
    tokens.add(compact.slice(i, i + 2))
  }
  if (compact.length === 1) tokens.add(compact)

  return tokens
}

/** Sørensen–Dice coefficient of two token sets, 0..1 */
export function diceSimilarity(a: string | null | undefined, b: string | null | undefined): number {
  const setA = tokenSet(a)
  const setB = tokenSet(b)
  if (setA.size === 0 || setB.size === 0) return 0
  let overlap = 0
  for (const token of setA) if (setB.has(token)) overlap += 1
  return (2 * overlap) / (setA.size + setB.size)
}

/** Best pairwise lexical similarity between two lists of phrases, 0..1 */
export function bestPairSimilarity(left: string[], right: string[]): number {
  let best = 0
  for (const l of left) {
    for (const r of right) {
      const score = diceSimilarity(l, r)
      if (score > best) best = score
    }
  }
  return best
}

export function clamp01(value: number): number {
  if (Number.isNaN(value)) return 0
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}
