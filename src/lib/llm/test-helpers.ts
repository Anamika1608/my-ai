import type { GenEvent } from './types';

/** Build a streaming Response from pre-framed SSE strings (each should include
 * its own `data: ...\n\n`). */
export function sseResponse(frames: string[], status = 200): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const f of frames) controller.enqueue(enc.encode(f));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'Content-Type': 'text/event-stream' } });
}

export function dataFrame(obj: unknown): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

export async function collect(gen: AsyncGenerator<GenEvent>): Promise<GenEvent[]> {
  const out: GenEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}
