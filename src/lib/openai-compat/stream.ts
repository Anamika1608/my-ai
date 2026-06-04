// OpenAI-compatible Server-Sent-Events encoder.
// Both Vapi (custom LLM) and the chat client parse this exact wire format.
// Each frame: `data: ${JSON}\n\n`. Terminal frame: `data: [DONE]\n\n`.

let counter = 0;

function frameId(): string {
  return `chatcmpl-${Date.now().toString(36)}${(counter++).toString(36)}`;
}

interface ChunkChoice {
  index: 0;
  delta: { role?: 'assistant'; content?: string };
  finish_reason: 'stop' | null;
}

function frame(model: string, choice: ChunkChoice): string {
  const payload = {
    id: frameId(),
    object: 'chat.completion.chunk',
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [choice],
  };
  return `data: ${JSON.stringify(payload)}\n\n`;
}

/** A content delta frame. */
export function sseChunk(model: string, deltaContent: string): string {
  return frame(model, { index: 0, delta: { content: deltaContent }, finish_reason: null });
}

/** Optional first frame announcing the assistant role (max OpenAI compatibility). */
export function sseRole(model: string): string {
  return frame(model, { index: 0, delta: { role: 'assistant' }, finish_reason: null });
}

/** Final content-less frame carrying finish_reason before [DONE]. */
export function sseFinish(model: string): string {
  return frame(model, { index: 0, delta: {}, finish_reason: 'stop' });
}

/** Stream terminator. */
export function sseDone(): string {
  return 'data: [DONE]\n\n';
}
