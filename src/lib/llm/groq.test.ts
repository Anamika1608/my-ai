import { describe, it, expect, vi, afterEach } from 'vitest';
import { streamGroq, toOpenAIMessages } from './groq';
import { sseResponse, dataFrame, collect } from './test-helpers';
import { LlmError } from './types';

afterEach(() => vi.unstubAllGlobals());

describe('toOpenAIMessages', () => {
  it('maps assistant tool_calls and tool results', () => {
    const out = toOpenAIMessages([
      { role: 'assistant', content: '', tool_calls: [{ id: 'c1', name: 'book', arguments: { a: 1 } }] },
      { role: 'tool', content: 'ok', tool_call_id: 'c1' },
    ]) as any[];
    expect(out[0].tool_calls[0].function).toEqual({ name: 'book', arguments: '{"a":1}' });
    expect(out[1]).toEqual({ role: 'tool', tool_call_id: 'c1', content: 'ok' });
  });
});

describe('streamGroq', () => {
  it('yields content tokens then done', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          dataFrame({ choices: [{ delta: { content: 'Hel' } }] }),
          dataFrame({ choices: [{ delta: { content: 'lo' } }] }),
          'data: [DONE]\n\n',
        ]),
      ),
    );
    const events = await collect(streamGroq([{ role: 'user', content: 'hi' }]));
    expect(events).toEqual([
      { type: 'token', text: 'Hel' },
      { type: 'token', text: 'lo' },
      { type: 'done' },
    ]);
  });

  it('accumulates a streamed tool_call across frames', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        sseResponse([
          dataFrame({ choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name: 'book_meeting', arguments: '{"startISO":"' } }] } }] }),
          dataFrame({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '2026-06-10T10:00:00Z"}' } }] } }] }),
          'data: [DONE]\n\n',
        ]),
      ),
    );
    const events = await collect(streamGroq([{ role: 'user', content: 'book' }]));
    expect(events[0]).toEqual({
      type: 'tool_call',
      call: { id: 'c1', name: 'book_meeting', arguments: { startISO: '2026-06-10T10:00:00Z' } },
    });
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('throws LlmError on non-ok response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 429 })));
    await expect(collect(streamGroq([{ role: 'user', content: 'hi' }]))).rejects.toBeInstanceOf(LlmError);
  });
});
