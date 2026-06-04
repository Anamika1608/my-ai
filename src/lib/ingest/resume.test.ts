import { describe, it, expect } from 'vitest';
import { splitResumeSections } from './resume';

const SAMPLE = `Ada Lovelace
Software Engineer

EXPERIENCE
Acme Corp — Senior Engineer (2022–2025)
Built distributed systems.

EDUCATION
University of London, BSc Computer Science

SKILLS
TypeScript, Python, RAG`;

describe('splitResumeSections', () => {
  it('returns [] for empty input', () => {
    expect(splitResumeSections('   ')).toEqual([]);
  });

  it('splits into detected sections plus a full-text doc', () => {
    const docs = splitResumeSections(SAMPLE);
    const titles = docs.map((d) => d.title);
    expect(titles).toContain('Résumé — Experience');
    expect(titles).toContain('Résumé — Education');
    expect(titles).toContain('Résumé — Skills');
    expect(titles).toContain('Résumé — Full Text');

    const exp = docs.find((d) => d.title === 'Résumé — Experience')!;
    expect(exp.text).toContain('Acme Corp');
    expect(exp.source).toBe('resume');
  });
});
