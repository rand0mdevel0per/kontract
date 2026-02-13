# Compiler

The compiler transforms a unified TypeScript codebase into separate client and server bundles, using `@backend` as the single decorator for marking server-side code.

## Build Pipeline

```
TypeScript Source
    ↓
ESLint Analysis (type extraction)
    ↓
Babel Transform (@backend extraction)
    ↓
Middleware Inlining (next() replacement)
    ↓
SWC Optimization (O3 passes)
    ↓
FlatBuffers Schema Generation
    ↓
Client Bundle + Server Bundle
```

## Decorator Specifications

### @backend

Marks a function for server-side execution:

```ts
@backend({ ugroup?: string, perm?: number, egroup?: string })
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `ugroup` | `string` | Required user group for access |
| `perm` | `number` | Permission bitmask (`R__`, `_W_`, `__X`, or combinations) |
| `egroup` | `string` | Endpoint group for middleware filtering |

Example:

```ts
@backend({ ugroup: 'admin', perm: 0b110, egroup: 'api-v1' })
async function deleteUser(id: string) {
  await env.storage.users.delete(id);
}
```

### @primkey

Marks a field as primary key in a storage table:

```ts
interface User {
  @primkey id: string;
  name: string;
}
```

If absent, the first field is used as primary key.

### @perm

Sets field-level permission restrictions:

```ts
interface User {
  @primkey id: string;
  @perm(perms.R__) email: string;  // read-only
  name: string;                     // read-write (default)
}
```

### @mwfilter

Applies filtering to middleware functions:

```ts
@mwfilter({ prefixurl?: string, egroup?: string, endpoints?: string[] })
```

- No parameters: applies to all requests
- `prefixurl`: matches URL prefix
- `egroup`: matches endpoint group
- `endpoints`: matches exact endpoint names

## Compilation Output

### Client Side

Backend functions are replaced with RPC stubs:

```ts
// Original
@backend({ egroup: 'api-v1' })
async function getUser(id: string): Promise<User | null> { ... }

// Generated client stub
export async function getUser(id: string): Promise<User | null> {
  return await __kontract_rpc('getUser', [id], { egroup: 'api-v1' });
}
```

### Server Side

Backend functions are registered in a route map:

```ts
__kontract_routes.set('getUser', {
  handler: async (ctx: Context, args: [string]) => {
    const [id] = args;
    return await env.storage.users.get(id);
  },
  meta: { egroup: 'api-v1', perm: 0b100 }
});
```

## Middleware Inlining

The compiler resolves applicable middleware at build time:

1. Load all middleware from `src/middleware.ts`
2. For each backend function, filter applicable middleware by `prefixurl`, `egroup`, `endpoints`
3. Replace `await next()` calls with the next middleware's code
4. Inline the result before the function body

Complexity: O(M x F) where M = middleware count, F = function count.

## Incremental Compilation

File-level hashing with SHA-256 enables selective recompilation:

```ts
buildCache(entries: FileEntry[], version?: string): CacheOutput

interface FileEntry {
  path: string;
  content: string;
  dependencies?: string[];
}
```

Only changed files and their dependents are recompiled.

## StorageRegistry Generation

The compiler uses the TypeScript Compiler API to extract interface definitions and generate typed storage access:

```ts
generateStorageRegistry(source: string): { dts: string; keys: string[] }
```

Generated output:

```ts
declare module 'kontract/runtime' {
  interface StorageRegistry {
    users: User;
    posts: Post;
  }
  interface Storage {
    get<K extends keyof StorageRegistry>(key: K): TableProxy<StorageRegistry[K]>;
  }
}
```
