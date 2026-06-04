import type { Corpus, RetrievalResult } from './types';

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/** Brute-force top-k cosine search over the in-memory corpus. */
export function retrieve(queryEmbedding: number[], corpus: Corpus, k = 6): RetrievalResult[] {
  return corpus.chunks
    .map((chunk) => ({ chunk, score: cosine(queryEmbedding, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map(({ chunk, score }) => {
      // Strip the embedding vector from the returned chunk — it is never needed
      // downstream (prompt building) and bloats payloads.
      const { embedding: _embedding, ...rest } = chunk;
      return { chunk: rest, score };
    });
}
