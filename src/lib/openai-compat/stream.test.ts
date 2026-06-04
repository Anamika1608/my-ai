import { describe, it, expect } from 'vitest';
import { sseChunk, sseRole, sseFinish, sseDone } from './stream';

function parse(frame: string) {
  expect(frame.startsWith('data: ')).toBe(true);
  expect(frame.endsWith('\n\n')).toBe(true);
  return JSON.parse(frame.slice('data: '.length).trim());
}

describe('openai-compat stream', () => {
  it('emits a parseable content delta in OpenAI chunk shape', () => {
    const obj = parse(sseChunk('llama-3.3-70b-versatile', 'Hello'));
    expect(obj.object).toBe('chat.completion.chunk');
    expect(obj.model).toBe('llama-3.3-70b-versatile');
    expect(obj.choices[0].delta.content).toBe('Hello');
    expect(obj.choices[0].finish_reason).toBeNull();
    expect(typeof obj.created).toBe('number');
  });

  it('emits a role frame', () => {
    const obj = parse(sseRole('m'));
    expect(obj.choices[0].delta.role).toBe('assistant');
  });

  it('emits a finish frame with finish_reason=stop', () => {
    const obj = parse(sseFinish('m'));
    expect(obj.choices[0].finish_reason).toBe('stop');
  });

  it('emits the [DONE] terminator', () => {
    expect(sseDone()).toBe('data: [DONE]\n\n');
  });

  it('produces unique ids across frames', () => {
    const a = parse(sseChunk('m', 'a')).id;
    const b = parse(sseChunk('m', 'b')).id;
    expect(a).not.toBe(b);
  });
});
