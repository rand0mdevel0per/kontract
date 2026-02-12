import { describe, it, expect } from 'vitest';
import { generateStorageRegistry } from '../src/compiler/storage-registry';

describe('storage registry', () => {
  it('generates dts and keys from interfaces', () => {
    const src = `
      interface User { id: string; name: string; }
      interface Post { id: string; title: string; }
    `;
    const r = generateStorageRegistry(src);
    expect(r.keys).toEqual(['user','post']);
    expect(r.dts).toContain('StorageRegistry');
  });
});
