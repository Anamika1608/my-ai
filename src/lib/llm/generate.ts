import type { ChatMessage, GenEvent, ToolSchema } from './types';
import { streamGroq } from './groq';
import { streamGemini } from './gemini';

// Re-export the shared LLM contract from here (plan §4: "import from generate").
export type { ChatMessage, ToolCall, GenEvent, ToolSchema } from './types';
export { LlmError } from './types';

/** If Groq has not produced its first event within this window, abort it and
 * fall back to Gemini. Keeps the <2s voice budget safe under Groq slowness. */
const FIRST_EVENT_TIMEOUT_MS = 4000;

class TimeoutError extends Error {
  constructor() {
    super('first-event timeout');
    this.name = 'TimeoutError';
  }
}

function withTimeout<T>(p: Promise<T>, ms: number, ctrl: AbortController): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      ctrl.abort();
      reject(new TimeoutError());
    }, ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Stream a grounded completion. Primary: Groq (fast). If Groq fails or stalls
 * BEFORE its first event, transparently fall back to Gemini — so the caller
 * never sees duplicated tokens. A mid-stream Groq failure (after tokens have
 * been emitted) ends gracefully rather than restarting.
 */
export async function* generate(
  messages: ChatMessage[],
  tools?: readonly ToolSchema[],
): AsyncGenerator<GenEvent> {
  const ctrl = new AbortController();
  const primary = streamGroq(messages, tools, ctrl.signal);

  let first: IteratorResult<GenEvent>;
  try {
    first = await withTimeout(primary.next(), FIRST_EVENT_TIMEOUT_MS, ctrl);
  } catch (err) {
    // Groq failed before emitting anything → clean fallback to Gemini.
    console.warn('[generate] Groq failed pre-stream, falling back to Gemini:', String(err));
    try {
      await primary.return?.(undefined as never);
    } catch {
      /* ignore */
    }
    yield* streamGemini(messages, tools);
    return;
  }

  if (!first.done) yield first.value;
  try {
    yield* primary;
  } catch (err) {
    console.warn('[generate] Groq failed mid-stream, ending gracefully:', String(err));
    yield { type: 'done' };
  }
}
