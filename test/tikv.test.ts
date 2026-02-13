import { describe, it, expect, beforeEach } from 'vitest';
import { TiKVDOStub, TiKVKVStore, createTiKVAdapter } from '../src/adapters/tikv';
import type { TiKVClient } from '../src/adapters/tikv';

function createMockTiKVClient(): TiKVClient & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    async get(key: string) {
      return data.get(key) ?? null;
    },
    async put(key: string, value: string) {
      data.set(key, value);
    },
    async delete(key: string) {
      data.delete(key);
    },
    async scan(prefix: string, limit: number) {
      const results: Array<{ key: string; value: string }> = [];
      for (const [k, v] of data) {
        if (k.startsWith(prefix)) {
          results.push({ key: k, value: v });
          if (results.length >= limit) break;
        }
      }
      return results;
    },
  };
}

describe('TiKVDOStub', () => {
  let client: ReturnType<typeof createMockTiKVClient>;
  let stub: TiKVDOStub;

  beforeEach(() => {
    client = createMockTiKVClient();
    stub = new TiKVDOStub(client, 'test:do:');
  });

  it('returns null for missing key', async () => {
    expect(await stub.get('x')).toBeNull();
  });

  it('set and get round-trip', async () => {
    await stub.set('k', { hello: 'world' });
    expect(await stub.get('k')).toEqual({ hello: 'world' });
  });

  it('persists to TiKV', async () => {
    await stub.set('k', 42);
    expect(client.data.has('test:do:k')).toBe(true);
    const stored = JSON.parse(client.data.get('test:do:k')!);
    expect(stored.value).toBe(42);
  });

  it('reads from TiKV when local cache misses', async () => {
    // Write directly to TiKV (simulating another node)
    const entry = JSON.stringify({ value: 'from-tikv', expiresAt: 0 });
    client.data.set('test:do:remote', entry);

    expect(await stub.get('remote')).toBe('from-tikv');
  });

  it('deletes from both local and TiKV', async () => {
    await stub.set('k', 'val');
    await stub.delete('k');
    expect(await stub.get('k')).toBeNull();
    expect(client.data.has('test:do:k')).toBe(false);
  });

  it('respects TTL expiration', async () => {
    await stub.set('k', 'val', { ttl: 1 }); // 1ms
    await new Promise((r) => setTimeout(r, 5));
    expect(await stub.get('k')).toBeNull();
  });

  it('cleans expired entries from TiKV on read', async () => {
    const entry = JSON.stringify({ value: 'old', expiresAt: Date.now() - 1000 });
    client.data.set('test:do:expired', entry);

    expect(await stub.get('expired')).toBeNull();
    // Should have cleaned up
    expect(client.data.has('test:do:expired')).toBe(false);
  });
});

describe('TiKVKVStore', () => {
  let client: ReturnType<typeof createMockTiKVClient>;
  let kv: TiKVKVStore;

  beforeEach(() => {
    client = createMockTiKVClient();
    kv = new TiKVKVStore(client, 'test:kv:');
  });

  it('returns null for missing key', async () => {
    expect(await kv.get('x')).toBeNull();
  });

  it('put and get round-trip', async () => {
    await kv.put('k', JSON.stringify({ data: 1 }));
    expect(await kv.get('k')).toEqual({ data: 1 });
  });

  it('stores with TTL', async () => {
    await kv.put('k', '"val"', { expirationTtl: 3600 });
    const stored = JSON.parse(client.data.get('test:kv:k')!);
    expect(stored.expiresAt).toBeGreaterThan(Date.now());
  });

  it('expires entries past TTL', async () => {
    // Write with an already-expired timestamp
    const envelope = JSON.stringify({ value: '"old"', expiresAt: Date.now() - 1000 });
    client.data.set('test:kv:expired', envelope);

    expect(await kv.get('expired')).toBeNull();
    expect(client.data.has('test:kv:expired')).toBe(false);
  });

  it('deletes key', async () => {
    await kv.put('k', '"val"');
    await kv.delete('k');
    expect(await kv.get('k')).toBeNull();
  });

  it('stores without TTL (expiresAt = 0)', async () => {
    await kv.put('k', '"val"');
    const stored = JSON.parse(client.data.get('test:kv:k')!);
    expect(stored.expiresAt).toBe(0);
  });
});

describe('createTiKVAdapter', () => {
  it('creates doStub and kv with default prefixes', () => {
    const client = createMockTiKVClient();
    const adapter = createTiKVAdapter({ client });
    expect(adapter.doStub).toBeInstanceOf(TiKVDOStub);
    expect(adapter.kv).toBeInstanceOf(TiKVKVStore);
  });

  it('accepts custom prefixes', async () => {
    const client = createMockTiKVClient();
    const adapter = createTiKVAdapter({
      client,
      doPrefix: 'myapp:do:',
      kvPrefix: 'myapp:kv:',
    });
    await adapter.doStub.set('x', 1);
    expect(client.data.has('myapp:do:x')).toBe(true);

    await adapter.kv.put('y', '"2"');
    expect(client.data.has('myapp:kv:y')).toBe(true);
  });

  it('works with SharedStorage', async () => {
    const { SharedStorage } = await import('../src/runtime/shared');
    const client = createMockTiKVClient();
    const adapter = createTiKVAdapter({ client });
    const shared = new SharedStorage(adapter.doStub, adapter.kv);

    await shared.set('key', { test: true });
    expect(await shared.get('key')).toEqual({ test: true });

    await shared.delete('key');
    expect(await shared.get('key')).toBeNull();
  });
});
