// Cal.com API v2 client. Slots and bookings use DIFFERENT cal-api-version
// values (verified against cal.com/docs/api-reference/v2). Backed by the
// candidate's real Google Calendar via the Cal.com event type.

const BASE = 'https://api.cal.com/v2';
const SLOTS_VERSION = '2024-09-04';
const BOOKINGS_VERSION = '2026-02-25';

export interface Slot {
  startISO: string;
  endISO: string;
}

export type BookingResult =
  | { ok: true; bookingId: string; confirmedISO: string }
  | { ok: false; reason: string };

function apiKey(): string {
  return process.env.CALCOM_API_KEY ?? '';
}
function eventTypeId(): string {
  return process.env.CALCOM_EVENT_TYPE_ID ?? '';
}
function timeZone(): string {
  return process.env.CALCOM_TIMEZONE ?? 'UTC';
}

/** Real open slots between two ISO dates (inclusive), flattened + sorted. */
export async function getSlots(fromISO: string, toISO: string): Promise<Slot[]> {
  const params = new URLSearchParams({
    eventTypeId: eventTypeId(),
    start: fromISO,
    end: toISO,
    timeZone: timeZone(),
    format: 'range',
  });
  const res = await fetch(`${BASE}/slots?${params.toString()}`, {
    headers: { Authorization: `Bearer ${apiKey()}`, 'cal-api-version': SLOTS_VERSION },
  });
  if (!res.ok) throw new Error(`Cal.com slots ${res.status}: ${await res.text()}`);
  const json: any = await res.json();
  const byDay: Record<string, Array<{ start: string; end?: string }>> = json?.data ?? {};
  const slots: Slot[] = [];
  for (const day of Object.keys(byDay)) {
    for (const s of byDay[day]) slots.push({ startISO: s.start, endISO: s.end ?? s.start });
  }
  slots.sort((a, b) => a.startISO.localeCompare(b.startISO));
  return slots;
}

/** Create a confirmed booking on the real calendar. */
export async function createBooking(startISO: string, name: string, email: string): Promise<BookingResult> {
  const res = await fetch(`${BASE}/bookings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      'cal-api-version': BOOKINGS_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      start: startISO,
      eventTypeId: Number(eventTypeId()),
      attendee: { name, email, timeZone: timeZone() },
    }),
  });
  let json: any = {};
  try {
    json = await res.json();
  } catch {
    /* non-JSON error body */
  }
  if (!res.ok || json?.status !== 'success' || !json?.data) {
    return { ok: false, reason: json?.error?.message ?? `Cal.com booking failed (${res.status})` };
  }
  return {
    ok: true,
    bookingId: String(json.data.uid ?? json.data.id),
    confirmedISO: json.data.start ?? startISO,
  };
}
