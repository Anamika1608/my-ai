import type { Corpus } from './types';

let cached: Corpus | null = null;

/** Load the precomputed corpus from the deployment's static asset
 * (`/corpus.json`) and cache it in module scope for the life of the edge
 * instance. Kept out of the code bundle to respect Edge size limits. */
export async function loadCorpus(origin: string): Promise<Corpus> {
  if (cached) return cached;
  const res = await fetch(`${origin}/corpus.json`, { cache: 'force-cache' });
  if (!res.ok) throw new Error(`failed to load corpus.json: ${res.status}`);
  cached = (await res.json()) as Corpus;
  return cached;
}

/** Test seam / warm-start injection. */
export function setCorpus(c: Corpus | null): void {
  cached = c;
}
