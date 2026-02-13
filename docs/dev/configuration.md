# Configuration

## Runtime Context

The runtime expects a `Context` object for every backend function invocation:

```ts
interface Context {
  sid: string;           // Session identifier
  owner: string;         // Tenant or account identifier
  currentTxid: bigint;   // Current transaction ID for MVCC
  perm: number;          // Permission bitmask
  method?: string;       // HTTP method
  path?: string;         // Request path
  headers?: Record<string, string>;
  route?: { name: string; egroup?: string };
}
```

Example:

```ts
const ctx: Context = {
  sid: 'session-1',
  owner: 'tenant-1',
  currentTxid: 10n,
  perm: perms.RWX  // 0b111
};
```

## Storage Table Requirements

The Storage Proxy resolves physical table names via the `storage` table:

```sql
CREATE TABLE storage (
  id TEXT PRIMARY KEY,
  ptr TEXT NOT NULL,
  owner TEXT NOT NULL,
  permissions INT NOT NULL
);

CREATE TABLE trxs (
  sid TEXT PRIMARY KEY,
  owner TEXT NOT NULL,
  create_txid BIGINT NOT NULL
);
```

## Permission Bits

Kontract uses a 3-bit permission mask matching Unix-style RWX:

| Constant | Value | Meaning |
|----------|-------|---------|
| `R__` | `0b100` (4) | Read |
| `_W_` | `0b010` (2) | Write |
| `__X` | `0b001` (1) | Execute/Delete |
| `RW_` | `0b110` (6) | Read + Write |
| `R_X` | `0b101` (5) | Read + Execute |
| `_WX` | `0b011` (3) | Write + Execute |
| `RWX` | `0b111` (7) | Full access |

Usage in `@backend` decorator:

```ts
@backend({ perm: perms.RW_ })  // Requires read + write
async function updateUser(id: string, data: Partial<User>) { ... }
```

## Environment Matrix

| Environment | Node.js | Database | Notes |
|-------------|---------|----------|-------|
| Local dev | 20+ | PostgreSQL 14+ | Use `npm run docs:dev` for preview |
| CI | 20+ | PostgreSQL 14+ | Lint, typecheck, test with coverage |
| Production | 20+ | PostgreSQL 14+ | Ensure `storage` and `trxs` tables exist |

## Configuration Checklist

- [ ] `ctx` includes `sid`, `owner`, `currentTxid`, `perm`
- [ ] `storage` table is populated for each logical table
- [ ] `trxs` table exists and records transaction metadata
- [ ] Permission bits align between session context and `@backend` decorator
- [ ] Data tables have `_txid`, `_deleted_txid`, `_owner`, `_order` columns

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run build` | TypeScript compilation |
| `npm run lint` | ESLint checks |
| `npm run typecheck` | TypeScript type verification |
| `npm run test` | Vitest with coverage thresholds |
| `npm run docs:dev` | VitePress dev server |
| `npm run docs:build` | Build documentation site |
