import { describe, it, expect } from 'vitest';
import { chunkText } from './chunk';

const wordsOf = (s: string) => s.split(/\s+/).filter(Boolean);

describe('chunkText', () => {
  it('returns a single chunk when text fits', () => {
    expect(chunkText('short text', { maxChars: 100 })).toEqual(['short text']);
  });

  it('returns [] for empty/whitespace', () => {
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('keeps every chunk within maxChars', () => {
    const para = 'lorem ipsum dolor sit amet '.repeat(50); // ~1350 chars
    const text = [para, para, para].join('\n\n');
    const chunks = chunkText(text, { maxChars: 500, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(500);
  });

  it('never splits a word across the boundary and loses no words', () => {
    const text = Array.from({ length: 400 }, (_, i) => `word${i}`).join(' ');
    const chunks = chunkText(text, { maxChars: 300, overlap: 40 });
    const seen = new Set(chunks.flatMap(wordsOf));
    for (const w of wordsOf(text)) expect(seen.has(w)).toBe(true);
  });

  it('creates overlap between consecutive chunks', () => {
    const text = Array.from({ length: 200 }, (_, i) => `tok${i}`).join(' ');
    const chunks = chunkText(text, { maxChars: 200, overlap: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    const firstTailWord = wordsOf(chunks[0]).at(-1)!;
    expect(chunks[1]).toContain(firstTailWord);
  });

  it('hard-splits a single word longer than maxChars', () => {
    const giant = 'x'.repeat(250);
    const chunks = chunkText(giant, { maxChars: 100 });
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(100);
    expect(chunks.join('').length).toBe(250);
  });
});
