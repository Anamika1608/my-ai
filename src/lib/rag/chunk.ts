// Boundary-aware text chunker. Packs words into chunks ≤ maxChars, preferring
// paragraph boundaries, never splitting a word, with character overlap carried
// between consecutive chunks.

export interface ChunkOptions {
  maxChars?: number;
  overlap?: number;
}

interface Tok {
  text: string;
  breakBefore: boolean; // true => paragraph break precedes this token
}

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Flatten text into word tokens, marking paragraph breaks and hard-splitting
 * any single word longer than maxChars (e.g. a long URL/token). */
function tokenize(clean: string, maxChars: number): Tok[] {
  const toks: Tok[] = [];
  const paras = clean.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  paras.forEach((para, pi) => {
    para.split(/\s+/).forEach((word, wi) => {
      const breakBefore = wi === 0 && pi > 0;
      if (word.length > maxChars) {
        for (let i = 0; i < word.length; i += maxChars) {
          toks.push({ text: word.slice(i, i + maxChars), breakBefore: breakBefore && i === 0 });
        }
      } else {
        toks.push({ text: word, breakBefore });
      }
    });
  });
  return toks;
}

export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const maxChars = opts.maxChars ?? 1800;
  const overlap = opts.overlap ?? 200;

  const clean = normalize(text);
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const toks = tokenize(clean, maxChars);
  const chunks: string[] = [];

  let i = 0;
  while (i < toks.length) {
    const start = i;
    let cur = '';
    while (i < toks.length) {
      const t = toks[i];
      const sep = cur === '' ? '' : t.breakBefore ? '\n\n' : ' ';
      const candidate = cur + sep + t.text;
      if (candidate.length > maxChars && cur !== '') break;
      cur = candidate;
      i++;
    }
    chunks.push(cur);
    if (i >= toks.length) break;

    // Back up so the next chunk overlaps ~`overlap` chars (word-aligned),
    // while always guaranteeing forward progress.
    let back = 0;
    let j = i - 1;
    while (j > start && back < overlap) {
      back += toks[j].text.length + 1;
      j--;
    }
    i = Math.max(j + 1, start + 1);
  }
  return chunks;
}
