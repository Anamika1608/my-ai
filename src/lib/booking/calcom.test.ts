import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSlots, createBooking } from './calcom';

beforeEach(() => {
  process.env.CALCOM_API_KEY = 'cal_test';
  process.env.CALCOM_EVENT_TYPE_ID = '10';
  process.env.CALCOM_TIMEZONE = 'UTC';
});
afterEach(() => vi.unstubAllGlobals());

describe('getSlots', () => {
  it('flattens day-keyed slots and sends the slots api version', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            status: 'success',
            data: {
              '2026-06-10': [{ start: '2026-06-10T10:00:00Z', end: '2026-06-10T10:30:00Z' }],
              '2026-06-11': [{ start: '2026-06-11T09:00:00Z', end: '2026-06-11T09:30:00Z' }],
            },
          }),
        ),
    );
    vi.stubGlobal('fetch', fetchMock);

    const slots = await getSlots('2026-06-10', '2026-06-12');
    expect(slots).toHaveLength(2);
    expect(slots[0].startISO).toBe('2026-06-10T10:00:00Z');
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['cal-api-version']).toBe('2024-09-04');
  });
});

describe('createBooking', () => {
  it('returns ok with bookingId on success and uses the bookings api version', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ status: 'success', data: { uid: 'bk_1', id: 99, start: '2026-06-10T10:00:00Z' } }), {
          status: 201,
        }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const r = await createBooking('2026-06-10T10:00:00Z', 'Recruiter', 'r@scaler.com');
    expect(r).toEqual({ ok: true, bookingId: 'bk_1', confirmedISO: '2026-06-10T10:00:00Z' });
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)['cal-api-version']).toBe('2026-02-25');
  });

  it('returns a failure reason on error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'slot taken' } }), { status: 400 })));
    const r = await createBooking('2026-06-10T10:00:00Z', 'R', 'r@x.com');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('slot taken');
  });
});
