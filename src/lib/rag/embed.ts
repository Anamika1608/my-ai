import { LlmError } from '../llm/types';
import { safeText } from '../llm/sse-read';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MODEL = 'text-embedding-004';
const BATCH = 100;

function key(): string {
  return process.env.GEMINI_API_KEY ?? '';
}

/** Embed many documents (ingestion). taskType RETRIEVAL_DOCUMENT improves
 * asymmetric retrieval quality vs. the query embedding. */
export async function embedDocuments(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const res = await fetch(`${BASE}/${MODEL}:batchEmbedContents?key=${key()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requests: slice.map((text) => ({
          model: `models/${MODEL}`,
          content: { parts: [{ text }] },
          taskType: 'RETRIEVAL_DOCUMENT',
        })),
      }),
    });
    if (!res.ok) throw new LlmError('gemini-embed', res.status, await safeText(res));
    const json: any = await res.json();
    for (const e of json.embeddings) out.push(e.values as number[]);
  }
  return out;
}

/** Embed a single query (brain hot path). taskType RETRIEVAL_QUERY. */
export async function embedQuery(text: string): Promise<number[]> {
  const res = await fetch(`${BASE}/${MODEL}:embedContent?key=${key()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: `models/${MODEL}`,
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_QUERY',
    }),
  });
  if (!res.ok) throw new LlmError('gemini-embed', res.status, await safeText(res));
  const json: any = await res.json();
  return json.embedding.values as number[];
}
