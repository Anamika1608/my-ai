import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/rag/corpus', () => ({
  loadCorpus: vi.fn(async () => ({
    generatedAt: 'x',
    embeddingModel: 'text-embedding-004',
    dims: 768,
    chunks: [],
  })),
  setCorpus: vi.fn(),
}));
vi.mock('@/lib/rag/embed', () => ({ embedQuery: vi.fn(async () => [1, 0, 0]) }));
vi.mock('@/lib/llm/generate', () => ({
  generate: async function* () {
    yield { type: 'token', text: 'Hi ' };
    yield { type: 'token', text: 'there' };
    yield { type: 'done' };
  },
}));

import { POST } from './route';

function brainReq(opts: { auth?: string; body?: unknown } = {}): Request {
  return new Request('http://localhost/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.auth ? { authorization: opts.auth } : {}),
    },
    body: JSON.stringify(opts.body ?? { messages: [{ role: 'user', content: 'who are you?' }] }),
  });
}

describe('brain POST', () => {
  beforeEach(() => {
    process.env.BRAIN_API_TOKEN = 'secret';
  });

  it('rejects unauthenticated requests', async () => {
    const res = await POST(brainReq());
    expect(res.status).toBe(401);
  });

  it('streams a grounded answer as OpenAI SSE chunks ending with [DONE]', async () => {
    const res = await POST(brainReq({ auth: 'Bearer secret' }));
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/event-stream');
    const text = await res.text();
    expect(text).toContain('"delta":{"role":"assistant"}');
    expect(text).toContain('Hi ');
    expect(text).toContain('there');
    expect(text).toContain('"finish_reason":"stop"');
    expect(text.trim().endsWith('data: [DONE]')).toBe(true);
  });

  it('returns a non-streaming completion when stream:false', async () => {
    const res = await POST(
      brainReq({ auth: 'Bearer secret', body: { stream: false, messages: [{ role: 'user', content: 'hi' }] } }),
    );
    const json = await res.json();
    expect(json.choices[0].message.content).toBe('Hi there');
  });

  it('400s when there is no user message', async () => {
    const res = await POST(brainReq({ auth: 'Bearer secret', body: { messages: [] } }));
    expect(res.status).toBe(400);
  });
});
