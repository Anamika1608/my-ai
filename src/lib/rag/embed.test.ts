import { describe, it, expect, vi, afterEach } from 'vitest';
import { embedDocuments, embedQuery } from './embed';

afterEach(() => vi.unstubAllGlobals());

describe('embed', () => {
  it('embedQuery returns the values vector', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ embedding: { values: [0.1, 0.2, 0.3] } }), { status: 200 })),
    );
    expect(await embedQuery('hello')).toEqual([0.1, 0.2, 0.3]);
  });

  it('embedDocuments returns one vector per input', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ embeddings: [{ values: [1] }, { values: [2] }] }), { status: 200 })),
    );
    expect(await embedDocuments(['a', 'b'])).toEqual([[1], [2]]);
  });
});
