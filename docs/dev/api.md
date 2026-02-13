# API Reference

## Storage Proxy

### TableProxy\<T\>

```ts
class TableProxy<T> {
  constructor(pg: PGClient, name: string, ctx: Context);
```

#### Methods

| Method | Signature | Description |
|--------|-----------|-------------|
| `getPtr()` | `() => Promise<string>` | Resolves physical table name from `storage` table |
| `get(id)` | `(id: string) => Promise<T \| null>` | Fetch visible record by ID (MVCC-filtered) |
| `set(id, value)` | `(id: string, value: T) => Promise<void>` | Insert or upsert a record |
| `delete(id)` | `(id: string) => Promise<boolean>` | Logical delete via `_deleted_txid` marker |
| `update(id, partial)` | `(id: string, partial: Partial<T>) => Promise<void>` | Merge partial fields into existing record |
| `push(value)` | `(value: T) => Promise<string>` | Append to ordered list, returns generated ID |
| `pop()` | `() => Promise<T \| null>` | Remove and return last item by `_order` |
| `shift()` | `() => Promise<T \| null>` | Remove and return first item by `_order` |
| `query(filter)` | `(filter: Partial<T>) => AsyncIterableIterator<T>` | JSONB containment query |
| `exec(sql, params)` | `(sql: string, params?: unknown[]) => Promise<{rows}>` | Guarded raw SQL with table name rewriting |

#### Errors

- Throws if ptr cannot be resolved from `storage` table
- Throws if `exec()` contains cross-table references
- Identifier validation rejects non-alphanumeric table names

### PGClient Interface

```ts
interface PGClient {
  query(sql: string, params?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>;
}
```

## SessionDO

```ts
class SessionDO {
  async allocateTxid(): Promise<bigint>;
  async beginTransaction(owner: string): Promise<{ sid: string; owner: string; currentTxid: bigint }>;
  async commit(sid: string): Promise<void>;
  get minActiveTxid(): bigint;
}
```

## HTTP Response Types

### HttpResp\<T\>

```ts
class HttpResp<T = any> {
  constructor(data: T, status?: number, headers?: Record<string, string>);

  static ok<T>(data: T, headers?: Record<string, string>): HttpResp<T>;
  static created<T>(data: T, headers?: Record<string, string>): HttpResp<T>;
  static noContent(headers?: Record<string, string>): HttpResp<null>;
  static redirect(url: string): HttpResp<null>;
}
```

### Error Classes

| Class | Status | Code |
|-------|--------|------|
| `HttpError` | any | any |
| `UnauthorizedError` | 401 | `UNAUTHORIZED` |
| `ForbiddenError` | 403 | `FORBIDDEN` |
| `NotFoundError` | 404 | `NOT_FOUND` |
| `PermissionError` | 403 | `PERMISSION_DENIED` |

## Compiler

### transformBackend

```ts
function transformBackend(source: string): BackendTransformResult;

interface BackendTransformResult {
  client: string;   // RPC stub code
  server: string;   // Route registration code
  routes: Array<{ name: string; meta: Record<string, unknown> }>;
}
```

### buildCache

```ts
function buildCache(entries: FileEntry[], version?: string): CacheOutput;

interface FileEntry {
  path: string;
  content: string;
  dependencies?: string[];
}

interface CacheOutput {
  files: Record<string, { hash: string; dependencies: string[] }>;
  version: string;
}
```

### generateStorageRegistry

```ts
function generateStorageRegistry(source: string): RegistryResult;

interface RegistryResult {
  dts: string;    // Generated .d.ts content
  keys: string[]; // Lowercase interface names
}
```

## Middleware

### filterApplicable

```ts
function filterApplicable(
  mw: Middleware[],
  path: string,
  egroup?: string,
  endpoint?: string
): Middleware[];
```

### inlineMiddlewareChain

```ts
function inlineMiddlewareChain(
  mw: Middleware[]
): (ctx: unknown, final: () => Promise<void>) => Promise<void>;
```

### Middleware Type

```ts
type Middleware = {
  fn: (ctx: unknown, next: () => Promise<void>) => Promise<void>;
  filter?: MiddlewareFilter;
};

interface MiddlewareFilter {
  prefixurl?: string;
  egroup?: string;
  endpoints?: string[];
}
```

## Permissions

### Constants

```ts
const perms = {
  R__: 0b100, _W_: 0b010, __X: 0b001,
  RW_: 0b110, R_X: 0b101, _WX: 0b011, RWX: 0b111
};
```

### Functions

```ts
function verifyAccess(ctx: PermContext, requiredPerm: number, owner?: string): void;
function checkTablePermission(perms: number, operation: 'read' | 'write' | 'delete'): void;
function checkFieldPermissions(data: Record<string, unknown>, fieldPerms: Record<string, number>, mask: number): void;
```

## Encryption (raystream)

```ts
function hkdf(input: Uint8Array, info: string, len: number): Uint8Array;
function encrypt(payload: Uint8Array, key: Uint8Array): { nonce: Uint8Array; data: Uint8Array; tag: Uint8Array };
function decrypt(encrypted: { nonce: Uint8Array; data: Uint8Array; tag: Uint8Array }, key: Uint8Array): Uint8Array;
```

Cipher selection: prefers `chacha20-poly1305`, falls back to `aes-256-gcm`.

## Protocol

### MessageType

```ts
enum MessageType {
  HANDSHAKE_INIT = 0x01, HANDSHAKE_RESPONSE = 0x02,
  RPC_CALL = 0x10, RPC_RESPONSE = 0x11, RPC_ERROR = 0x12,
  SUBSCRIBE = 0x20, EVENT = 0x21,
  HEARTBEAT = 0x30, CLOSE = 0xFF
}
```

### ErrorCode

```ts
enum ErrorCode {
  UNAUTHORIZED, FORBIDDEN, NOT_FOUND, INVALID_REQUEST, PERMISSION_DENIED,
  INTERNAL_ERROR, SERVICE_UNAVAILABLE, TIMEOUT,
  SESSION_EXPIRED, DECRYPTION_FAILED, INVALID_NONCE
}
```

## Events

### EventBus

```ts
class EventBus {
  subscribe(table: string, handler: SubscriptionHandler): () => void;
  emit(table: string, event: ChangeEvent): void;
  listenerCount(table: string): number;
}
```

### formatSSE

```ts
function formatSSE(event: ChangeEvent): string;
// Returns: "data: {json}\n\n"
```

### ChangeEvent

```ts
type ChangeEvent = {
  type: 'insert' | 'update' | 'delete';
  id: string;
  data?: unknown;
  oldData?: unknown;
};
```

## Migrations

### diffSchemas

```ts
function diffSchemas(oldS: Schema, newS: Schema): { safe: boolean; changes: Array<{ type: string; field: string }> };
```

### generateSQLAddField

```ts
function generateSQLAddField(ptr: string, field: string, fieldType: string): string;
```

## Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| `KONTRACT_CTX_MISSING` | Required context fields missing | Provide `sid`, `owner`, `currentTxid`, `perm` |
| `KONTRACT_STORAGE_PTR_NOT_FOUND` | ptr resolution failed | Ensure `storage` registry row exists |
| `KONTRACT_EXEC_CROSS_TABLE` | Cross-table SQL blocked | Restrict `exec` to current table |
| `KONTRACT_PERMISSION_DENIED` | Permission bitmask rejected | Align `perm` and `@backend` meta |
| `KONTRACT_TXID_INVALID` | txid missing or invalid | Set `currentTxid` from session |
| `KONTRACT_DECORATOR_PARSE_FAILED` | `@backend` parse failed | Enable decorators plugin |
| `KONTRACT_CRYPTO_UNSUPPORTED` | Crypto algorithm unavailable | Check OpenSSL build |
| `KONTRACT_DECRYPT_FAILED` | Ciphertext verification failed | Verify key, nonce, and tag |
