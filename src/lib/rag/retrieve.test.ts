import { describe, it, expect } from 'vitest';
import { cosine, retrieve } from './retrieve';
import type { Corpus } from './types';

const corpus: Corpus = {
  generatedAt: '2026-06-06',
  embeddingModel: 'text-embedding-004',
  dims: 768,
  chunks: [
    { id: 'a', text: 'A', source: 'resume', title: 'A', embedding: [1, 0, 0] },
    { id: 'b', text: 'B', source: 'resume', title: 'B', embedding: [0, 1, 0] },
    { id: 'c', text: 'C', source: 'resume', title: 'C', embedding: [0, 0, 1] },
  ],
};

describe('cosine', () => {
  it('is 1 for identical direction', () => {
    expect(cosine([2, 0], [3, 0])).toBeCloseTo(1);
  });
  it('is 0 for orthogonal', () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0);
  });
  it('is 0 when a vector is zero', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0);
  });
});

describe('retrieve', () => {
  it('ranks the nearest chunk first', () => {
    expect(retrieve([1, 0, 0], corpus, 1)[0].chunk.id).toBe('a');
  });
  it('respects k', () => {
    expect(retrieve([1, 1, 1], corpus, 2)).toHaveLength(2);
  });
  it('strips the embedding from returned chunks', () => {
    const top = retrieve([1, 0, 0], corpus, 1)[0];
    expect('embedding' in top.chunk).toBe(false);
  });
});
