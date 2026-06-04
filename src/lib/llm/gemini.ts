import type { ChatMessage, GenEvent, ToolSchema } from './types';
import { LlmError } from './types';
import { readSSE, safeText } from './sse-read';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
export const GEMINI_MODEL = 'gemini-2.0-flash';

interface GeminiContents {
  system?: string;
  contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
}

/** Convert our ChatMessage[] to Gemini contents. System messages are hoisted
 * into systemInstruction. Prior tool calls/results are rendered as text — this
 * only matters on the rare cross-provider fallback path, where fidelity of a
 * past tool exchange is less important than continuing to produce an answer. */
export function toGeminiContents(messages: ChatMessage[]): GeminiContents {
  const systems: string[] = [];
  const contents: GeminiContents['contents'] = [];
  for (const m of messages) {
    if (m.role === 'system') {
      systems.push(m.content);
    } else if (m.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: m.content }] });
    } else if (m.role === 'assistant') {
      const calls = m.tool_calls?.length
        ? ` ${m.tool_calls.map((t) => `[called ${t.name}(${JSON.stringify(t.arguments)})]`).join(' ')}`
        : '';
      contents.push({ role: 'model', parts: [{ text: `${m.content}${calls}`.trim() || ' ' }] });
    } else if (m.role === 'tool') {
      contents.push({ role: 'user', parts: [{ text: `[tool result] ${m.content}` }] });
    }
  }
  return { system: systems.join('\n\n') || undefined, contents };
}

export async function* streamGemini(
  messages: ChatMessage[],
  tools?: readonly ToolSchema[],
  signal?: AbortSignal,
): AsyncGenerator<GenEvent> {
  const { system, contents } = toGeminiContents(messages);
  const body = {
    contents,
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    ...(tools?.length
      ? {
          tools: [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parameters: t.parameters,
              })),
            },
          ],
        }
      : {}),
    generationConfig: { temperature: 0.3 },
  };

  const url = `${BASE}/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${process.env.GEMINI_API_KEY ?? ''}`;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new LlmError('gemini', res.status, await safeText(res));
  }

  for await (const data of readSSE(res)) {
    if (data === '[DONE]') break;
    let json: any;
    try {
      json = JSON.parse(data);
    } catch {
      continue;
    }
    const parts = json.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      if (typeof p.text === 'string' && p.text.length) {
        yield { type: 'token', text: p.text };
      }
      if (p.functionCall) {
        yield {
          type: 'tool_call',
          call: {
            id: `call_${p.functionCall.name}`,
            name: p.functionCall.name,
            arguments: p.functionCall.args ?? {},
          },
        };
      }
    }
  }
  yield { type: 'done' };
}

/** Non-streaming completion used by the eval harness (returns raw text). */
export async function judge(prompt: string): Promise<string> {
  const url = `${BASE}/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY ?? ''}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0 },
    }),
  });
  if (!res.ok) throw new LlmError('gemini', res.status, await safeText(res));
  const json: any = await res.json();
  return (json.candidates?.[0]?.content?.parts ?? []).map((p: any) => p.text ?? '').join('');
}
