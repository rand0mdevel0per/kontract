/**
 * TiKV-backed implementations of DOStub and KVStore.
 * Enables Kontract deployment on any platform with TiKV consensus.
 *
 * Architecture (from spec discussion):
 *   - DO logic runs on the triggering node (local memory)
 *   - State is persisted to TiKV for cross-node visibility
 *   - Other nodes read/write through TiKV
 *   - SharedStorage(TiKVDOStub, TiKVKVStore) provides the two-tier cache
 */

import type { DOStub, KVStore } from '../runtime/shared';

// ── TiKV Client Interface ────────────────────────────────

/**
 * Minimal TiKV raw KV client interface.
 * Users provide an implementation backed by gRPC (@tikv/client)
 * or any TiKV-compatible API.
 */
export interface TiKVClient {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  scan(prefix: string, limit: number): Promise<Array<{ key: string; value: string }>>;
}

// ── TiKV DOStub ──────────────────────────────────────────

interface TiKVEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * DOStub backed by local memory (hot path) + TiKV (persistence).
 * The triggering node holds state in-process; TiKV provides
 * cross-node consistency and crash recovery.
 */
export class TiKVDOStub implements DOStub {
  private local = new Map<string, TiKVEntry>();

  constructor(
    private client: TiKVClient,
    private prefix: string = 'kontract:do:',
  ) {}

  async get<T>(key: string): Promise<T | null> {
    // Tier 1: local memory
    const cached = this.local.get(key);
    if (cached) {
      if (cached.expiresAt > 0 && Date.now() > cached.expiresAt) {
        this.local.delete(key);
      } else {
        return cached.value as T;
      }
    }

    // Tier 2: TiKV
    const raw = await this.client.get(this.prefix + key);
    if (raw === null) return null;

    const entry: TiKVEntry = JSON.parse(raw);
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) {
      await this.client.delete(this.prefix + key);
      return null;
    }

    // Backfill local cache
    this.local.set(key, entry);
    return entry.value as T;
  }

  async set<T>(key: string, value: T, opts?: { ttl?: number }): Promise<void> {
    const expiresAt = opts?.ttl ? Date.now() + opts.ttl : 0;
    const entry: TiKVEntry = { value, expiresAt };

    // Write local
    this.local.set(key, entry);

    // Write TiKV (persistence)
    await this.client.put(this.prefix + key, JSON.stringify(entry));
  }

  async delete(key: string): Promise<void> {
    this.local.delete(key);
    await this.client.delete(this.prefix + key);
  }
}

// ── TiKV KVStore ─────────────────────────────────────────

/**
 * KVStore backed entirely by TiKV.
 * Replaces Cloudflare KV for non-CF deployments.
 * TTL is tracked via stored timestamps (TiKV doesn't have native TTL).
 */
export class TiKVKVStore implements KVStore {
  constructor(
    private client: TiKVClient,
    private prefix: string = 'kontract:kv:',
  ) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const raw = await this.client.get(this.prefix + key);
    if (raw === null) return null;

    const envelope: { value: string; expiresAt: number } = JSON.parse(raw);
    if (envelope.expiresAt > 0 && Date.now() > envelope.expiresAt) {
      await this.client.delete(this.prefix + key);
      return null;
    }

    return JSON.parse(envelope.value) as T;
  }

  async put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> {
    const expiresAt = opts?.expirationTtl
      ? Date.now() + opts.expirationTtl * 1000
      : 0;
    const envelope = JSON.stringify({ value, expiresAt });
    await this.client.put(this.prefix + key, envelope);
  }

  async delete(key: string): Promise<void> {
    await this.client.delete(this.prefix + key);
  }
}

// ── Factory ──────────────────────────────────────────────

export interface TiKVAdapterOptions {
  client: TiKVClient;
  doPrefix?: string;
  kvPrefix?: string;
}

/**
 * Create DOStub + KVStore pair backed by TiKV.
 * Use with SharedStorage for the full two-tier cache.
 *
 * ```ts
 * import { createTiKVAdapter } from 'kontract';
 * import { SharedStorage } from 'kontract';
 *
 * const { doStub, kv } = createTiKVAdapter({ client: myTiKVClient });
 * const shared = new SharedStorage(doStub, kv);
 * ```
 */
export function createTiKVAdapter(opts: TiKVAdapterOptions): {
  doStub: TiKVDOStub;
  kv: TiKVKVStore;
} {
  return {
    doStub: new TiKVDOStub(opts.client, opts.doPrefix ?? 'kontract:do:'),
    kv: new TiKVKVStore(opts.client, opts.kvPrefix ?? 'kontract:kv:'),
  };
}
