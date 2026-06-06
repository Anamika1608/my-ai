import { describe, it, expect, beforeEach } from 'vitest';
import { requireBearer, rateLimit, resetRateLimit } from './auth';

function req(auth?: string): Request {
  return new Request('http://x/v1/chat/completions', {
    headers: auth ? { authorization: auth } : {},
  });
}

describe('requireBearer', () => {
  beforeEach(() => {
    process.env.BRAIN_API_TOKEN = 'secret-token';
  });

  it('accepts the correct bearer', () => {
    expect(requireBearer(req('Bearer secret-token'))).toBe(true);
  });
  it('rejects a wrong/missing token', () => {
    expect(requireBearer(req('Bearer nope'))).toBe(false);
    expect(requireBearer(req())).toBe(false);
  });
  it('accepts the token via ?key= query param', () => {
    const r = new Request('http://x/v1/chat/completions?key=secret-token');
    expect(requireBearer(r)).toBe(true);
  });
  it('fails closed when no token configured', () => {
    delete process.env.BRAIN_API_TOKEN;
    expect(requireBearer(req('Bearer anything'))).toBe(false);
  });
});

describe('rateLimit', () => {
  beforeEach(() => resetRateLimit());

  it('allows up to the cap then blocks', () => {
    let allowed = 0;
    for (let i = 0; i < 35; i++) if (rateLimit('ip-1', 30).ok) allowed++;
    expect(allowed).toBe(30);
    expect(rateLimit('ip-1', 30).ok).toBe(false);
  });

  it('keys are independent', () => {
    for (let i = 0; i < 30; i++) rateLimit('ip-a', 30);
    expect(rateLimit('ip-b', 30).ok).toBe(true);
  });
});
