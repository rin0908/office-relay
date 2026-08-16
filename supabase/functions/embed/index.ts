// OFFICE RELAY : embedding generation (Supabase Edge Function)
//
// Uses the embedding model that ships with the Supabase Edge Runtime
// (`gte-small`, 384 dimensions). No external embedding provider, no API key,
// no paid contract - the vectors that feed pgvector are produced here.
//
// POST { "inputs": ["...", "..."] } -> { "embeddings": number[][], "model": "gte-small" }

// @ts-expect-error - Supabase.ai is provided by the Supabase Edge Runtime
const session = new Supabase.ai.Session('gte-small')

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    const body = await req.json()
    const inputs: string[] = Array.isArray(body?.inputs) ? body.inputs : [body?.input]

    const cleaned = inputs
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.replace(/\s+/g, ' ').trim().slice(0, 2000))
      .filter((value) => value.length > 0)

    if (cleaned.length === 0) {
      return new Response(JSON.stringify({ error: 'inputs must be a non-empty string array' }), {
        status: 400,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const embeddings: number[][] = []
    for (const text of cleaned) {
      const embedding = (await session.run(text, {
        mean_pool: true,
        normalize: true,
      })) as number[]
      embeddings.push(embedding)
    }

    return new Response(
      JSON.stringify({ model: 'gte-small', dimensions: embeddings[0]?.length ?? 0, embeddings }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
