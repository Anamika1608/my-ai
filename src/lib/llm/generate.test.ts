import { describe, it, expect, vi, afterEach } from 'vitest';
import { generate } from './generate';
import { sseResponse, dataFrame, collect } from './test-helpers';

afterEach(() => vi.unstubAllGlobals());

function routeFetch(handlers: { groq?: () => Response; gemini?: () => Response }) {
  return vi.fn(async (url: string | URL) => {
    const u = String(url);
    if (u.includes('groq.com')) return handlers.groq?.() ?? new Response('', { status: 500 });
    if (u.includes('generativelanguage')) return handlers.gemini?.() ?? new Response('', { status: 500 });
    throw new Error(`unexpected url ${u}`);
  });
}

describe('generate', () => {
  it('uses Groq when healthy', async () => {
    vi.stubGlobal(
      'fetch',
      routeFetch({
        groq: () => sseResponse([dataFrame({ choices: [{ delta: { content: 'groq-says-hi' } }] }), 'data: [DONE]\n\n']),
      }),
    );
    const events = await collect(generate([{ role: 'user', content: 'hi' }]));
    expect(events).toContainEqual({ type: 'token', text: 'groq-says-hi' });
  });

  it('falls back to Gemini when Groq errors before first token', async () => {
    vi.stubGlobal(
      'fetch',
      routeFetch({
        groq: () => new Response('boom', { status: 429 }),
        gemini: () => sseResponse([dataFrame({ candidates: [{ content: { parts: [{ text: 'gemini-fallback' }] } }] })]),
      }),
    );
    const events = await collect(generate([{ role: 'user', content: 'hi' }]));
    expect(events).toContainEqual({ type: 'token', text: 'gemini-fallback' });
  });
});
