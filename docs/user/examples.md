# Usage Examples

## Define a Backend Function

```ts
class UserService {
  @backend({ egroup: 'api', perm: 0b111 })
  async getUser(id: string) {
    return { id };
  }
}
```

## Compile Output (Conceptual)

```ts
export async function getUser(...args) {
  return await __kontract_rpc('getUser', args, { egroup: 'api', perm: 7 });
}
__kontract_routes.set('getUser', { handler: async (ctx, args) => new UserService()['getUser'](...args), meta: { egroup: 'api', perm: 7 } });
```

## Use Storage Proxy

```ts
const proxy = new TableProxy(pg, 'users', ctx);
const user = await proxy.get('user-1');
```

## Update With MVCC

```ts
await proxy.update('user-1', { nickname: 'new-name' });
```

## Middleware Chain

```ts
const middleware = [
  { fn: async (ctx, next) => { await next(); }, filter: { prefixurl: '/api' } },
  { fn: async (ctx, next) => { await next(); }, filter: { egroup: 'api' } }
];
const run = inlineMiddlewareChain(middleware);
await run(ctx, handler);
```

## Middleware Filter by Endpoint

```ts
const middleware = [
  { fn: async (ctx, next) => { await next(); }, filter: { endpoints: ['getUser'] } }
];
```

## SSE Event Output

```ts
const payload = formatSSE({ type: 'insert', id: '1', data: { name: 'A' } });
```
