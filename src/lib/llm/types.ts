// Shared LLM contracts (plan §4). Re-exported from generate.ts for consumers.

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string; // when role === 'tool'
  tool_calls?: ToolCall[]; // when assistant requests tools
}

export type GenEvent =
  | { type: 'token'; text: string }
  | { type: 'tool_call'; call: ToolCall }
  | { type: 'done' };

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export class LlmError extends Error {
  constructor(
    public provider: string,
    public status: number,
    message: string,
  ) {
    super(`[${provider} ${status}] ${message}`);
    this.name = 'LlmError';
  }
}
