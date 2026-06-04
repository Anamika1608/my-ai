/**
 * Build the RAG corpus from the candidate's real résumé + GitHub.
 * Usage: npm run ingest   (reads keys from .env)
 * Output: public/corpus.json  (committed; served statically and loaded by the brain)
 */
import 'dotenv/config';
import { writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fetchRepoData } from '../src/lib/ingest/github.js';
import { parseResume } from '../src/lib/ingest/resume.js';
import { chunkText } from '../src/lib/rag/chunk.js';
import { embedDocuments } from '../src/lib/rag/embed.js';
import type { Corpus, EmbeddedChunk } from '../src/lib/rag/types.js';
import type { RawDoc } from '../src/lib/ingest/types.js';

function chunkId(source: string, title: string, ordinal: number): string {
  return createHash('sha1').update(`${source}:${title}:${ordinal}`).digest('hex');
}

async function main() {
  const username = process.env.GITHUB_USERNAME;
  if (!username) throw new Error('GITHUB_USERNAME not set in .env');
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not set in .env');
  const token = process.env.GITHUB_TOKEN;
  const allowlist = process.env.GITHUB_REPO_ALLOWLIST?.split(',').map((s) => s.trim()).filter(Boolean);

  console.log(`▸ Fetching GitHub repos for @${username} …`);
  const repoDocs = await fetchRepoData(username, token, allowlist);
  console.log(`  ${repoDocs.length} repo documents`);

  let resumeDocs: RawDoc[] = [];
  try {
    resumeDocs = await parseResume('data/resume.pdf');
    console.log(`  ${resumeDocs.length} résumé sections`);
  } catch (e) {
    console.warn(`  ⚠ résumé skipped (data/resume.pdf): ${String(e)}`);
  }

  const docs: RawDoc[] = [...resumeDocs, ...repoDocs];
  if (!docs.length) throw new Error('No source documents found — check GITHUB_USERNAME / resume path.');

  const pre: Omit<EmbeddedChunk, 'embedding'>[] = [];
  for (const d of docs) {
    chunkText(d.text, { maxChars: 1800, overlap: 200 }).forEach((text, i) => {
      pre.push({ id: chunkId(d.source, d.title, i), text, source: d.source, title: d.title, repo: d.repo, url: d.url });
    });
  }
  console.log(`▸ Chunked into ${pre.length} chunks. Embedding with text-embedding-004 …`);

  const embeddings = await embedDocuments(pre.map((c) => c.text));
  if (embeddings.length !== pre.length) throw new Error('embedding count mismatch');
  const chunks: EmbeddedChunk[] = pre.map((c, i) => ({ ...c, embedding: embeddings[i] }));

  const corpus: Corpus = {
    generatedAt: new Date().toISOString(),
    embeddingModel: 'text-embedding-004',
    dims: 768,
    chunks,
  };
  await writeFile('public/corpus.json', JSON.stringify(corpus));

  const bySource = chunks.reduce<Record<string, number>>((acc, c) => {
    acc[c.source] = (acc[c.source] ?? 0) + 1;
    return acc;
  }, {});
  console.log('✓ Wrote public/corpus.json');
  console.table(bySource);
}

main().catch((e) => {
  console.error('✗ ingest failed:', e);
  process.exit(1);
});
