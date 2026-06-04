import type { SourceType } from '../rag/types';

/** A source document before chunking/embedding. */
export interface RawDoc {
  text: string;
  source: SourceType;
  title: string;
  repo?: string;
  url?: string;
}
