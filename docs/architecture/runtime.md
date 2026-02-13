# Runtime

The runtime manages sessions, MVCC transactions, Storage Proxy access, and event delivery.

## Component Responsibilities

```
Gateway (Cloudflare Workers)
├─ Request routing
├─ Middleware execution
├─ Encryption/decryption
└─ Session management

DO Session
├─ Transaction ID allocation
├─ MVCC visibility tracking
├─ Active transaction registry
└─ Session key storage

DO KVC (Key-Value Cache)
├─ Global shared state
├─ Rate limiting counters
└─ Ephemeral data (< 1 hour TTL)

PostgreSQL
├─ Persistent data storage
├─ Transaction history
├─ Trigger-based change notification
└─ ACID guarantees
```

## SessionDO

`SessionDO` coordinates transaction IDs and tracks active transactions for MVCC visibility.

```ts
class SessionDO {
  private currentTxid: bigint = 0n;
  private activeTxs = new Map<string, bigint>();

  async allocateTxid(): Promise<bigint>;
  async beginTransaction(owner: string): Promise<{ sid: string; owner: string; currentTxid: bigint }>;
  async commit(sid: string): Promise<void>;
  get minActiveTxid(): bigint;
}
```

- `allocateTxid()` returns a monotonically increasing transaction ID
- `beginTransaction(owner)` creates a new session with a fresh txid
- `commit(sid)` removes the session from the active set
- `minActiveTxid` returns the lowest active txid, used for garbage collection

## Context Injection

Every backend function receives an implicit context:

```ts
interface Context {
  sid: string;           // Session ID
  owner: string;         // User/tenant identifier
  currentTxid: bigint;   // Current transaction ID
  perm: number;          // Permission bitmask
  method?: string;       // HTTP method
  path?: string;         // Request path
  headers?: Record<string, string>;
  route?: { name: string; egroup?: string };
}
```

The gateway populates context before function invocation. It is not included in the function signature.

## Storage Proxy

`TableProxy<T>` provides transparent access to PostgreSQL tables through JavaScript object notation.

```ts
class TableProxy<T> {
  constructor(pg: PGClient, name: string, ctx: Context);

  async getPtr(): Promise<string>;
  async get(id: string): Promise<T | null>;
  async set(id: string, value: T): Promise<void>;
  async delete(id: string): Promise<boolean>;
  async update(id: string, partial: Partial<T>): Promise<void>;
  async push(value: T): Promise<string>;
  async pop(): Promise<T | null>;
  async shift(): Promise<T | null>;
  async *query(filter: Partial<T>): AsyncIterableIterator<T>;
  async exec(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}
```

### Storage Access Flow

1. Backend accesses `env.storage.users.get(id)`
2. Storage Proxy queries `storage` table for ptr mapping
3. PostgreSQL queried with MVCC filter (`_txid < currentTxid`)
4. Result returned

### MVCC Filtering

All reads automatically apply visibility rules:

```sql
SELECT data FROM {ptr}
WHERE id = $1
  AND _txid < $2
  AND (_deleted_txid IS NULL OR _deleted_txid >= $2)
```

Deletes are logical (soft-delete via `_deleted_txid` marker), not physical.

## Response Types

### HttpResp

```ts
class HttpResp<T = any> {
  static ok<T>(data: T, headers?: Record<string, string>): HttpResp<T>;
  static created<T>(data: T, headers?: Record<string, string>): HttpResp<T>;
  static noContent(headers?: Record<string, string>): HttpResp<null>;
  static redirect(url: string): HttpResp<null>;
}
```

### Error Hierarchy

```ts
class HttpError extends Error { status: number; code?: string; }
class UnauthorizedError extends HttpError { /* 401 UNAUTHORIZED */ }
class ForbiddenError extends HttpError    { /* 403 FORBIDDEN */ }
class NotFoundError extends HttpError     { /* 404 NOT_FOUND */ }
class PermissionError extends HttpError   { /* 403 PERMISSION_DENIED */ }
```

## Event Subscription

```ts
class EventBus {
  subscribe(table: string, handler: SubscriptionHandler): () => void;
  emit(table: string, event: ChangeEvent): void;
  listenerCount(table: string): number;
}
```

Events follow the SSE format:

```ts
type ChangeEvent = {
  type: 'insert' | 'update' | 'delete';
  id: string;
  data?: unknown;
  oldData?: unknown;
};
```
