import { requireBearer, rateLimit } from '@/lib/security/auth';
import { loadCorpus } from '@/lib/rag/corpus';
import { embedQuery } from '@/lib/rag/embed';
import { retrieve } from '@/lib/rag/retrieve';
import { buildSystemPrompt, type PersonaMode } from '@/lib/persona/systemPrompt';
import { runConversation } from '@/lib/persona/runConversation';
import type { ChatMessage } from '@/lib/llm/types';
import { GROQ_MODEL } from '@/lib/llm/groq';
import { sseRole, sseChunk, sseFinish, sseDone } from '@/lib/openai-compat/stream';
import type { RetrievalResult } from '@/lib/rag/types';

export const runtime = 'edge';

const RETRIEVAL_K = 6;

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: { message, type: 'invalid_request_error' } }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Health check (also lets Vapi/uptime pings verify the endpoint is alive). */
export function GET(): Response {
  return new Response(JSON.stringify({ status: 'ok', service: 'brain' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(req: Request): Promise<Response> {
  if (!requireBearer(req)) return jsonError(401, 'unauthorized');
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!rateLimit(ip).ok) return jsonError(429, 'rate limited');

  const url = new URL(req.url);
  const mode: PersonaMode = url.searchParams.get('mode') === 'voice' ? 'voice' : 'chat';

  let body: any;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, 'invalid json body');
  }

  const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
  if (!lastUser) return jsonError(400, 'no user message');

  // ── Retrieval ───────────────────────────────────────────────────────────
  let retrieved: RetrievalResult[] = [];
  try {
    const corpus = await loadCorpus(url.origin);
    const qvec = await embedQuery(lastUser.content);
    retrieved = retrieve(qvec, corpus, RETRIEVAL_K);
  } catch (e) {
    // Degrade gracefully: with no context the persona will honestly say it
    // lacks the detail rather than hallucinate.
    console.warn('[brain] retrieval failed:', String(e));
  }

  const system = buildSystemPrompt(retrieved, mode);
  const convo: ChatMessage[] = [
    { role: 'system', content: system },
    ...messages.filter((m) => m.role !== 'system'),
  ];

  const model: string = typeof body?.model === 'string' ? body.model : GROQ_MODEL;
  const wantsStream = body?.stream !== false;

  // ── Non-streaming (used by the eval harness) ────────────────────────────
  if (!wantsStream) {
    let text = '';
    for await (const tok of runConversation(convo)) text += tok;
    return new Response(
      JSON.stringify({
        id: `chatcmpl-${Date.now().toString(36)}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model,
        choices: [{ index: 0, message: { role: 'assistant', content: text }, finish_reason: 'stop' }],
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  }

  // ── Streaming (chat UI + Vapi) ──────────────────────────────────────────
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (s: string) => controller.enqueue(enc.encode(s));
      send(sseRole(model));
      try {
        for await (const tok of runConversation(convo)) send(sseChunk(model, tok));
      } catch (e) {
        console.error('[brain] generation error:', String(e));
        send(sseChunk(model, ' Sorry — I hit an internal error just now.'));
      }
      send(sseFinish(model));
      send(sseDone());
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
