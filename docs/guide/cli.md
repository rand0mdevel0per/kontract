# CLI

The `kontract` CLI provides commands for scaffolding projects, deploying to Cloudflare Workers, and managing database migrations.

## Installation

```bash
npm install -g @rand0mdevel0per/kontract
```

Or use via `npx`:

```bash
npx kontract --help
```

## Commands

### `kontract init <name>`

Scaffolds a new Kontract project.

```bash
kontract init my-app
```

Generated files:

```
my-app/
  package.json        ← Dependencies and scripts
  wrangler.toml       ← Cloudflare Workers configuration
  tsconfig.json       ← TypeScript configuration
  sql/init.sql        ← PostgreSQL schema (storage + trxs tables)
  src/gateway.ts      ← Gateway entry point with fetch() handler
```

Options:

| Flag | Description |
|------|-------------|
| `--hyperdrive` | Pre-configure Cloudflare Hyperdrive binding for PostgreSQL acceleration |
| `--skip-install` | Skip automatic `npm install` after scaffolding |

After init:

```bash
cd my-app
wrangler secret put DATABASE_URL
wrangler secret put KONTRACT_SECRET
npm run dev
```

### `kontract deploy`

Builds and deploys the project to Cloudflare Workers.

```bash
kontract deploy
kontract deploy --env production
kontract deploy --hyperdrive --database-url "postgresql://user:pass@host:5432/db"
```

The deploy command:

1. **Pre-flight checks** — verifies `wrangler.toml`, `package.json`, and wrangler CLI availability
2. **Hyperdrive setup** (if `--hyperdrive`) — creates a Hyperdrive config and appends the binding to `wrangler.toml`
3. **Build** — runs `npm run build` if a build script exists
4. **Deploy** — runs `wrangler deploy`

Options:

| Flag | Description |
|------|-------------|
| `--env <name>` | Target environment (`production`, `staging`) |
| `--hyperdrive` | Set up Cloudflare Hyperdrive for PostgreSQL |
| `--database-url <url>` | PostgreSQL connection string (required with `--hyperdrive`) |
| `--skip-checks` | Skip pre-flight validation |

### `kontract migrate create <name>`

Creates a new migration file.

```bash
kontract migrate create add-users-table
```

Output:

```
Created migration v1: migrations/0001_add-users-table.ts
```

Generated migration template:

```ts
// Migration 1: add-users-table
// Generated at 2025-01-15T12:00:00.000Z

export default {
  version: 1,

  up: async (db) => {
    // await db.exec('ALTER TABLE ...');
    // await db.updateSchema('tableName', { field: { type: 'string' } });
  },

  down: async (db) => {
    // Reverse the changes made in up()
  },
};
```

See [Migrations](./migrations.md) for the full migration workflow.

## General Flags

| Flag | Description |
|------|-------------|
| `--help` | Show help text |
| `--version` | Show installed version |
