# API Reference

This reference describes the runtime, compiler, and protocol APIs exposed by the prototype implementation.

## Naming Conventions

- Logical table name: the identifier used in TableProxy
- ptr: physical table name resolved from storage registry
- txid: monotonically increasing transaction id for MVCC

## Storage Proxy

```ts
const proxy = new TableProxy(pg, 'users', ctx);
const user = await proxy.get('user-1');
```

Behavior:

- Resolves table ptr from storage table
- Enforces MVCC visibility based on current txid
- Rejects cross‑table access in exec

Key methods:

- get(id): fetch visible record by id
- set(data): insert a new version
- update(id, patch): merge partial fields and insert
- delete(id): logical delete by txid marker
- query(where): JSON containment query
- exec(sql, params): guarded SQL with table name rewriting

Errors:

- Throws if the table ptr cannot be resolved
- Throws if exec contains cross‑table references
- Throws if required context is missing

## @backend Compiler

```ts
class Service {
  @backend({ egroup: 'api-v1', perm: 0b111 })
  async getUser(id: string) {
    return { id };
  }
}
```

Artifacts:

- Client stub calling __kontract_rpc
- Server route mapping with meta

Route metadata:

- egroup: route group for middleware filtering
- perm: permission bitmask used by runtime guards

Compilation flow:

1. Parse source with decorators support
2. Extract @backend metadata
3. Emit client stubs
4. Emit server route map

## Middleware

```ts
const middleware = [
  { fn: async (ctx, next) => { await next(); }, filter: { prefixurl: '/api' } },
  { fn: async (ctx, next) => { await next(); }, filter: { egroup: 'api-v1' } }
];
const run = inlineMiddlewareChain(middleware);
await run(ctx, handler);
```

Filtering:

- prefixurl: matches request path
- egroup: matches route group
- endpoints: matches function name

Execution:

- Middleware runs in order after filtering
- next() composes into a single handler

Expected shape:

```ts
type Middleware = {
  fn: (ctx: unknown, next: () => Promise<void>) => Promise<void>;
  filter?: { prefixurl?: string; egroup?: string; endpoints?: string[] };
};
```

## Raystream

```ts
const { data, nonce, tag } = encrypt(payload, key);
const out = decrypt({ data, nonce, tag }, key);
```

Encryption:

- Prefers chacha20‑poly1305 if supported
- Falls back to aes‑256‑gcm

Key derivation:

- Uses SHA‑256 based helpers in the prototype

Payload layout:

- data: ciphertext
- nonce: per‑message nonce
- tag: authentication tag

## SSE Events

```ts
const payload = formatSSE({ type: 'insert', id: '1', data: { name: 'A' } });
```

Fields:

- type: insert | update | delete | custom
- id: entity id
- data: payload object
