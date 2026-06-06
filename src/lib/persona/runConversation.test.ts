import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GenEvent } from '../llm/types';

const { gen, calcom } = vi.hoisted(() => ({
  gen: vi.fn(),
  calcom: { getSlots: vi.fn(), createBooking: vi.fn() },
}));

vi.mock('../llm/generate', () => ({ generate: (...args: unknown[]) => gen(...args) }));
vi.mock('../booking/calcom', () => calcom);

import { runConversation } from './runConversation';

async function* stream(events: GenEvent[]) {
  for (const e of events) yield e;
}

async function drain(initial: Parameters<typeof runConversation>[0]): Promise<string> {
  let out = '';
  for await (const tok of runConversation(initial)) out += tok;
  return out;
}

describe('runConversation', () => {
  beforeEach(() => {
    gen.mockReset();
    calcom.createBooking.mockReset();
    calcom.getSlots.mockReset();
  });

  it('streams the answer directly when no tool is called', async () => {
    gen.mockReturnValueOnce(stream([{ type: 'token', text: 'Hello' }, { type: 'done' }]));
    expect(await drain([{ role: 'user', content: 'hi' }])).toBe('Hello');
    expect(gen).toHaveBeenCalledTimes(1);
  });

  it('executes book_meeting server-side then streams the confirmation', async () => {
    calcom.createBooking.mockResolvedValue({ ok: true, bookingId: 'bk_1', confirmedISO: '2026-06-10T10:00:00Z' });
    gen
      .mockReturnValueOnce(
        stream([
          { type: 'tool_call', call: { id: 'c1', name: 'book_meeting', arguments: { startISO: '2026-06-10T10:00:00Z', name: 'Rec', email: 'r@x.com' } } },
          { type: 'done' },
        ]),
      )
      .mockReturnValueOnce(stream([{ type: 'token', text: 'Booked! ' }, { type: 'token', text: 'See you then.' }, { type: 'done' }]));

    expect(await drain([{ role: 'user', content: 'book 10am' }])).toBe('Booked! See you then.');
    expect(calcom.createBooking).toHaveBeenCalledWith('2026-06-10T10:00:00Z', 'Rec', 'r@x.com');
    expect(gen).toHaveBeenCalledTimes(2);
  });
});
