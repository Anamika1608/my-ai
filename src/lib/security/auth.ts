// Bearer auth + best-effort in-memory rate limiting to protect the LLM budget
// if the brain URL leaks. (Upstash can back rateLimit later for multi-instance.)

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/** True iff the request carries the correct bearer token. Fails closed when
 * BRAIN_API_TOKEN is unset. */
export function requireBearer(req: Request): boolean {
  const token = process.env.BRAIN_API_TOKEN;
  if (!token) return false;
  const header = req.headers.get('authorization') ?? '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? timingSafeEqual(m[1].trim(), token) : false;
}

interface Bucket {
  tokens: number;
  updated: number;
}

const buckets = new Map<string, Bucket>();
const CAP = 30; // burst
const WINDOW_MS = 60_000; // refill CAP tokens per minute
const REFILL_PER_MS = CAP / WINDOW_MS;

/** Token-bucket limiter, best-effort per edge instance. */
export function rateLimit(key: string, cap: number = CAP): { ok: boolean } {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: cap, updated: now };
  b.tokens = Math.min(cap, b.tokens + (now - b.updated) * REFILL_PER_MS);
  b.updated = now;
  if (b.tokens < 1) {
    buckets.set(key, b);
    return { ok: false };
  }
  b.tokens -= 1;
  buckets.set(key, b);
  return { ok: true };
}

/** Test seam. */
export function resetRateLimit(): void {
  buckets.clear();
}
