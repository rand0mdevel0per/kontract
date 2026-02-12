import { createHash } from 'crypto';

export interface FileEntry {
  path: string;
  content: string;
  dependencies?: string[];
}

export interface CacheOutput {
  files: Record<string, {
    hash: string;
    dependencies: string[];
  }>;
  version: string;
}

export function buildCache(entries: FileEntry[], version = '1.0.0'): CacheOutput {
  const files: CacheOutput['files'] = {};
  for (const e of entries) {
    const h = createHash('sha256').update(e.content).digest('hex');
    files[e.path] = {
      hash: `sha256:${h}`,
      dependencies: e.dependencies ?? []
    };
  }
  return { files, version };
}
