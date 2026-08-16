import { supabasePublishableKey, supabaseUrl } from '@/lib/env'

/**
 * Text embeddings for pgvector.
 *
 * The model (`gte-small`, 384 dims) runs inside the Supabase Edge Function
 * `embed`, i.e. no third-party AI credential is required and no key is shipped
 * to the browser. Embeddings are best-effort: when the function is not
 * available the matching engine transparently falls back to lexical scoring,
 * so the Golden Path never breaks.
 */
export async function embedTexts(
  texts: string[],
  accessToken?: string,
): Promise<number[][] | null> {
  const inputs = texts.map((t) => t.trim()).filter(Boolean)
  if (inputs.length === 0) return null

  try {
    const response = await fetch(`${supabaseUrl()}/functions/v1/embed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabasePublishableKey(),
        Authorization: `Bearer ${accessToken ?? supabasePublishableKey()}`,
      },
      body: JSON.stringify({ inputs }),
      signal: AbortSignal.timeout(15_000),
    })
    if (!response.ok) {
      console.warn('[embeddings] edge function returned', response.status)
      return null
    }
    const payload = (await response.json()) as { embeddings?: number[][] }
    if (!payload.embeddings || payload.embeddings.length !== inputs.length) return null
    return payload.embeddings
  } catch (error) {
    console.warn('[embeddings] unavailable:', (error as Error).message)
    return null
  }
}

export async function embedText(text: string, accessToken?: string): Promise<number[] | null> {
  const result = await embedTexts([text], accessToken)
  return result?.[0] ?? null
}

/** pgvector literal, e.g. "[0.1,0.2,...]" */
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.map((v) => v.toFixed(6)).join(',')}]`
}
