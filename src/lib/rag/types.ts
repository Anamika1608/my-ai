// Shared RAG contracts — SINGLE SOURCE OF TRUTH (plan §4). Do not diverge.

export type SourceType =
  | 'resume'
  | 'repo_meta'
  | 'repo_readme'
  | 'repo_commit'
  | 'repo_file';

export interface Chunk {
  /** stable: sha1(`${source}:${title}:${ordinal}`) */
  id: string;
  text: string;
  source: SourceType;
  /** human label, e.g. "README — my-ai" or "Resume — Experience" */
  title: string;
  /** repo name when source starts with repo_ */
  repo?: string;
  /** link back to the source (repo/file/commit) */
  url?: string;
}

export interface EmbeddedChunk extends Chunk {
  /** 768-dim, Gemini text-embedding-004 */
  embedding: number[];
}

export interface Corpus {
  generatedAt: string;
  embeddingModel: 'text-embedding-004';
  dims: 768;
  chunks: EmbeddedChunk[];
}

export interface RetrievalResult {
  chunk: Chunk;
  score: number;
}
