import { describe, it, expect } from 'vitest';
import { mean, precisionRecall, wer } from './metrics';

describe('precisionRecall', () => {
  it('computes precision and recall', () => {
    const { precision, recall } = precisionRecall(['a', 'b', 'x', 'y'], ['a', 'b', 'c']);
    expect(precision).toBeCloseTo(2 / 4);
    expect(recall).toBeCloseTo(2 / 3);
  });
  it('handles empties', () => {
    expect(precisionRecall([], ['a'])).toEqual({ precision: 0, recall: 0 });
  });
});

describe('wer', () => {
  it('is 0 for identical text', () => {
    expect(wer('the quick brown fox', 'the quick brown fox')).toBe(0);
  });
  it('counts one substitution in four words as 0.25', () => {
    expect(wer('the quick brown fox', 'the quick green fox')).toBeCloseTo(0.25);
  });
  it('counts a deletion', () => {
    expect(wer('a b c d', 'a b c')).toBeCloseTo(0.25);
  });
});

describe('mean', () => {
  it('averages', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([])).toBe(0);
  });
});
