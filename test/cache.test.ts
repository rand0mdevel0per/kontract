import { describe, it, expect } from 'vitest';
import { buildCache } from '../src/compiler/cache';

describe('compiler cache', () => {
  it('computes sha256 hashes', () => {
    const out = buildCache([{ path: 'a.ts', content: 'let a=1;' }], '1.0.0');
    expect(out.files['a.ts'].hash.startsWith('sha256:')).toBe(true);
    expect(out.version).toBe('1.0.0');
  });
});
