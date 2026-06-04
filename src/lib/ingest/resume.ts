import { readFile } from 'node:fs/promises';
import type { RawDoc } from './types';

const SECTION_RE =
  /^(summary|objective|about|profile|experience|work experience|professional experience|employment|education|projects|personal projects|skills|technical skills|certifications|achievements|awards|publications|interests|contact)\b/i;

function titleCase(s: string): string {
  return s.replace(/\w\S*/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Split résumé plain text into per-section RawDocs (+ a full-text safety net). */
export function splitResumeSections(raw: string): RawDoc[] {
  const text = raw.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return [];

  const sections: { title: string; body: string[] }[] = [{ title: 'Overview', body: [] }];
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (t && t.length < 40 && SECTION_RE.test(t)) {
      sections.push({ title: t.replace(/[:•\-\s]+$/, ''), body: [] });
    } else {
      sections[sections.length - 1].body.push(line);
    }
  }

  const docs: RawDoc[] = [];
  for (const s of sections) {
    const body = s.body.join('\n').trim();
    if (body) docs.push({ source: 'resume', title: `Résumé — ${titleCase(s.title)}`, text: body });
  }
  // Full text guarantees nothing is lost if heading detection misses a section.
  docs.push({ source: 'resume', title: 'Résumé — Full Text', text });
  return docs;
}

export async function parseResume(path: string): Promise<RawDoc[]> {
  const buf = await readFile(path);
  // Import the lib entrypoint directly to avoid pdf-parse's index.js debug shim.
  const { default: pdf } = await import('pdf-parse/lib/pdf-parse.js');
  const data = await pdf(buf);
  return splitResumeSections(data.text);
}
