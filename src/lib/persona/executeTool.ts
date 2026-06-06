import type { ToolCall } from '../llm/types';
import { getSlots, createBooking } from '../booking/calcom';

const MAX_SLOTS_RETURNED = 8;

/** Execute a tool call server-side and return a JSON string the model reads
 * back as the tool result. Never throws — failures become structured errors. */
export async function executeTool(call: ToolCall): Promise<string> {
  try {
    if (call.name === 'check_availability') {
      const { from, to } = call.arguments as { from?: string; to?: string };
      if (!from || !to) return JSON.stringify({ error: 'from and to ISO dates are required' });
      const slots = await getSlots(from, to);
      return JSON.stringify({
        count: slots.length,
        slots: slots.slice(0, MAX_SLOTS_RETURNED).map((s) => s.startISO),
      });
    }

    if (call.name === 'book_meeting') {
      const { startISO, name, email } = call.arguments as { startISO?: string; name?: string; email?: string };
      if (!startISO || !name || !email) {
        return JSON.stringify({ error: 'startISO, name and email are all required to book' });
      }
      return JSON.stringify(await createBooking(startISO, name, email));
    }

    return JSON.stringify({ error: `unknown tool: ${call.name}` });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}
