import type { ToolSchema } from '../llm/types';

/** Tools the brain executes server-side. Identical for voice and chat. */
export const TOOL_SCHEMAS: ToolSchema[] = [
  {
    name: 'check_availability',
    description: "Get the candidate's real open interview slots within a date range.",
    parameters: {
      type: 'object',
      required: ['from', 'to'],
      properties: {
        from: { type: 'string', description: 'ISO date (inclusive), e.g. 2026-06-10' },
        to: { type: 'string', description: 'ISO date (inclusive), e.g. 2026-06-17' },
      },
    },
  },
  {
    name: 'book_meeting',
    description:
      'Book a confirmed meeting on the real calendar. Only call after the caller has provided a specific start time, their name, and their email.',
    parameters: {
      type: 'object',
      required: ['startISO', 'name', 'email'],
      properties: {
        startISO: { type: 'string', description: 'Slot start as ISO 8601, e.g. 2026-06-10T10:00:00Z' },
        name: { type: 'string', description: "The recruiter's full name" },
        email: { type: 'string', description: "The recruiter's email for the calendar invite" },
      },
    },
  },
];
