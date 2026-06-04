import type { ChatMessage, GenEvent, ToolSchema } from './types';
import { LlmError } from './types';
import { readSSE, safeText } from './sse-read';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

/** Map our ChatMessage[] to OpenAI chat-completions message format. */
export function toOpenAIMessages(messages: ChatMessage[]): unknown[] {
  return messages.map((m) => {
    if (m.role === 'assistant' && m.tool_calls?.length) {
      return {
        role: 'assistant',
        content: m.content || null,
        tool_calls: m.tool_calls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        })),
      };
    }
    if (m.role === 'tool') {
      return { role: 'tool', tool_call_id: m.tool_call_id, content: m.content };
    }
    return { role: m.role, content: m.content };
  });
}

export function toOpenAITools(tools: readonly ToolSchema[]): unknown[] {
  return tools.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.parameters },
  }));
}

interface PartialToolCall {
  id: string;
  name: string;
  args: string;
}

export async function* streamGroq(
  messages: ChatMessage[],
  tools?: readonly ToolSchema[],
  signal?: AbortSignal,
): AsyncGenerator<GenEvent> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: toOpenAIMessages(messages),
      ...(tools?.length ? { tools: toOpenAITools(tools), tool_choice: 'auto' } : {}),
      stream: true,
      temperature: 0.3,
    }),
  });

  if (!res.ok || !res.body) {
    throw new LlmError('groq', res.status, await safeText(res));
  }

  const acc = new Map<number, PartialToolCall>();
  for await (const data of readSSE(res)) {
    if (data === '[DONE]') break;
    let json: any;
    try {
      json = JSON.parse(data);
    } catch {
      continue;
    }
    const delta = json.choices?.[0]?.delta;
    if (!delta) continue;

    if (typeof delta.content === 'string' && delta.content.length) {
      yield { type: 'token', text: delta.content };
    }
    if (Array.isArray(delta.tool_calls)) {
      for (const tc of delta.tool_calls) {
        const idx: number = tc.index ?? 0;
        const e = acc.get(idx) ?? { id: '', name: '', args: '' };
        if (tc.id) e.id = tc.id;
        if (tc.function?.name) e.name = tc.function.name;
        if (typeof tc.function?.arguments === 'string') e.args += tc.function.arguments;
        acc.set(idx, e);
      }
    }
  }

  for (const e of acc.values()) {
    if (!e.name) continue;
    let args: Record<string, unknown> = {};
    try {
      args = e.args ? JSON.parse(e.args) : {};
    } catch {
      /* malformed partial args — emit empty, model can retry */
    }
    yield { type: 'tool_call', call: { id: e.id || `call_${e.name}`, name: e.name, arguments: args } };
  }
  yield { type: 'done' };
}
