import { generate } from '../llm/generate';
import type { ChatMessage, ToolCall } from '../llm/types';
import { TOOL_SCHEMAS } from './tools';
import { executeTool } from './executeTool';

const MAX_TOOL_ITERS = 3;

/**
 * Drive one assistant turn, executing booking tools server-side and looping
 * the tool results back into the model. Yields natural-language tokens across
 * all passes — identical for voice and chat. Tool calls never reach the client.
 */
export async function* runConversation(initial: ChatMessage[]): AsyncGenerator<string> {
  let messages = initial;

  for (let iter = 0; iter <= MAX_TOOL_ITERS; iter++) {
    const calls: ToolCall[] = [];
    let assistantText = '';
    // Offer tools on every pass except a final safety pass that forces an answer.
    const tools = iter < MAX_TOOL_ITERS ? TOOL_SCHEMAS : undefined;

    for await (const ev of generate(messages, tools)) {
      if (ev.type === 'token') {
        assistantText += ev.text;
        yield ev.text;
      } else if (ev.type === 'tool_call') {
        calls.push(ev.call);
      }
    }

    if (calls.length === 0) return; // final answer already streamed

    messages = [...messages, { role: 'assistant', content: assistantText, tool_calls: calls }];
    for (const call of calls) {
      const result = await executeTool(call);
      messages = [...messages, { role: 'tool', content: result, tool_call_id: call.id }];
    }
  }
}
