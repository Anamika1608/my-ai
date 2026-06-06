// Pure metric helpers for the eval harness.

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Retrieval precision/recall of `retrieved` ids against the `relevant` set. */
export function precisionRecall(retrieved: string[], relevant: string[]): { precision: number; recall: number } {
  const rel = new Set(relevant);
  const hit = retrieved.filter((id) => rel.has(id)).length;
  return {
    precision: retrieved.length ? hit / retrieved.length : 0,
    recall: relevant.length ? hit / relevant.length : 0,
  };
}

/** Word Error Rate via word-level Levenshtein distance (0 = perfect). */
export function wer(reference: string, hypothesis: string): number {
  const r = reference.toLowerCase().split(/\s+/).filter(Boolean);
  const h = hypothesis.toLowerCase().split(/\s+/).filter(Boolean);
  if (r.length === 0) return h.length === 0 ? 0 : 1;

  const d: number[][] = Array.from({ length: r.length + 1 }, () => new Array(h.length + 1).fill(0));
  for (let i = 0; i <= r.length; i++) d[i][0] = i;
  for (let j = 0; j <= h.length; j++) d[0][j] = j;
  for (let i = 1; i <= r.length; i++) {
    for (let j = 1; j <= h.length; j++) {
      d[i][j] = r[i - 1] === h[j - 1] ? d[i - 1][j - 1] : 1 + Math.min(d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]);
    }
  }
  return d[r.length][h.length] / r.length;
}

export function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}
