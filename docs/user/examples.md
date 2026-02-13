# Usage Examples

## End-to-End: User CRUD

### 1. Define the Interface

```ts
interface User {
  @primkey id: string;
  name: string;
  @perm(perms.R__) email: string;
  age: number;
}
```

### 2. Write Backend Functions

```ts
class UserService {
  @backend({ egroup: 'api-v1', perm: perms.RWX })
  async createUser(name: string, email: string, age: number) {
    const id = crypto.randomUUID();
    await env.storage.users.set(id, { id, name, email, age });
    return HttpResp.created({ id, name, email, age });
  }

  @backend({ egroup: 'api-v1', perm: perms.R__ })
  async getUser(id: string) {
    const user = await env.storage.users.get(id);
    if (!user) throw new NotFoundError();
    return user;
  }

  @backend({ egroup: 'api-v1', perm: perms.RW_ })
  async updateUser(id: string, data: Partial<User>) {
    await env.storage.users.update(id, data);
    return HttpResp.ok({ updated: true });
  }

  @backend({ egroup: 'admin', perm: perms.RWX })
  async deleteUser(id: string) {
    await env.storage.users.delete(id);
    return HttpResp.noContent();
  }
}
```

### 3. Compiler Output

Client stub (auto-generated):

```ts
export async function createUser(name: string, email: string, age: number) {
  return await __kontract_rpc('createUser', [name, email, age], { egroup: 'api-v1', perm: 7 });
}
```

Server route (auto-generated):

```ts
__kontract_routes.set('createUser', {
  handler: async (ctx, args) => new UserService()['createUser'](...args),
  meta: { egroup: 'api-v1', perm: 7 }
});
```

### 4. Client Usage

```ts
const user = await createUser('Alice', 'alice@example.com', 30);
const fetched = await getUser(user.id);
await updateUser(user.id, { name: 'Bob' });
```

## Storage Proxy Operations

```ts
const proxy = new TableProxy(pg, 'tasks', ctx);

// Key-value operations
await proxy.set('task-1', { title: 'Write docs', done: false });
const task = await proxy.get('task-1');

// List operations (ordered by _order)
const id = await proxy.push({ title: 'Review PR', done: false });
const last = await proxy.pop();
const first = await proxy.shift();

// Query with JSONB containment
for await (const t of proxy.query({ done: false })) {
  console.log(t.title);
}

// Raw SQL (restricted to current table)
const results = await proxy.exec(
  "SELECT data FROM tasks WHERE data->>'done' = $1",
  ['false']
);
```

## Middleware Chain

```ts
const middleware = [
  // Rate limiting for all API routes
  {
    fn: async (ctx, next) => {
      const key = `rate:${ctx.owner}`;
      const count = await env.shared.get(key) ?? 0;
      if (count > 100) throw new HttpError('Rate limited', 429);
      await env.shared.set(key, count + 1, { ttl: 60 });
      await next();
    },
    filter: { prefixurl: '/api' }
  },

  // Admin guard for admin endpoints
  {
    fn: async (ctx, next) => {
      if (ctx.perm < perms.RWX) throw new ForbiddenError();
      await next();
    },
    filter: { egroup: 'admin' }
  }
];

const chain = inlineMiddlewareChain(filterApplicable(middleware, '/api/users', 'api-v1'));
await chain(ctx, handler);
```

## Encryption

```ts
import { encrypt, decrypt, hkdf } from 'kontract';

// Derive session key
const sessionKey = hkdf(sharedSecret, 'raystream-v1', 32);

// Encrypt
const payload = new TextEncoder().encode(JSON.stringify({ method: 'getUser', args: ['123'] }));
const { nonce, data, tag } = encrypt(payload, sessionKey);

// Decrypt
const decrypted = decrypt({ nonce, data, tag }, sessionKey);
const message = JSON.parse(new TextDecoder().decode(decrypted));
```

## Event Subscription

```ts
const bus = new EventBus();

// Subscribe
const unsubscribe = bus.subscribe('users', (event) => {
  console.log(`${event.type}: ${event.id}`);
  if (event.type === 'insert') {
    console.log('New user data:', event.data);
  }
});

// Emit (from server-side handler)
bus.emit('users', {
  type: 'insert',
  id: 'user-123',
  data: { name: 'Alice', email: 'alice@example.com' }
});

// SSE format for HTTP streaming
const ssePayload = formatSSE({ type: 'insert', id: 'user-123', data: { name: 'Alice' } });
// → "data: {\"type\":\"insert\",\"id\":\"user-123\",\"data\":{\"name\":\"Alice\"}}\n\n"

// Cleanup
unsubscribe();
```
