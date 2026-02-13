# Migrations

Kontract tracks database schema changes through a lock file and versioned migration files. The migration system detects field additions, validates type safety, and generates SQL.

## How It Works

```
kontract.lock.json     ← Tracks current schema state and migration history
migrations/
  0001_add-users.ts    ← Migration files (up/down)
  0002_add-orders.ts
```

### Lock File

The lock file (`kontract.lock.json`) records:

- **version** — current schema version number
- **tables** — schema snapshot for each table (fields, types, ptr, hash)
- **migrations** — ordered list of applied migrations with timestamps and SQL

```json
{
  "version": 2,
  "tables": {
    "users": {
      "ptr": "tbl_users_abc123",
      "schema": {
        "name": { "type": "string" },
        "age": { "type": "number" }
      },
      "hash": "a1b2c3d4"
    }
  },
  "migrations": [
    {
      "version": 1,
      "timestamp": "2025-01-15T12:00:00.000Z",
      "changes": [{ "type": "add_field", "table": "users", "field": "name", "fieldType": "string" }],
      "sql": "ALTER TABLE tbl_users_abc123 ADD COLUMN name TEXT;"
    }
  ]
}
```

### Schema Diffing

`diffSchemas(oldSchema, newSchema)` compares two schema snapshots and returns:

- **Safe changes**: field additions (additive-only)
- **Unsafe changes**: field removals or type changes (returns `safe: false`)

```ts
import { diffSchemas } from 'kontract';

const result = diffSchemas(
  { name: { type: 'string' } },
  { name: { type: 'string' }, email: { type: 'string' } }
);
// { safe: true, changes: [{ type: 'add_field', field: 'email' }] }
```

Unsafe operations (field removal, type change) are rejected to prevent data loss. Handle these manually with explicit migration SQL.

### Type Mapping

| TypeScript | PostgreSQL |
|-----------|-----------|
| `string` | `TEXT` |
| `number` | `DOUBLE PRECISION` |
| `boolean` | `BOOLEAN` |
| Other | `TEXT` (fallback) |

## Workflow

### 1. Create a Migration

```bash
kontract migrate create add-email-to-users
```

This increments the lock file version and generates `migrations/0001_add-email-to-users.ts`.

### 2. Write the Migration

```ts
export default {
  version: 1,

  up: async (db) => {
    await db.exec('ALTER TABLE tbl_users_abc123 ADD COLUMN email TEXT;');
  },

  down: async (db) => {
    await db.exec('ALTER TABLE tbl_users_abc123 DROP COLUMN email;');
  },
};
```

### 3. Apply the Migration

Run the `up()` function against your database, then update the lock file:

```ts
import { readLockFile, applyMigration, writeLockFile } from 'kontract';

const lock = readLockFile('.') ?? createEmptyLockFile();
const migration = {
  version: 1,
  changes: [{ type: 'add_field', table: 'users', field: 'email', fieldType: 'string' }],
  sql: 'ALTER TABLE tbl_users_abc123 ADD COLUMN email TEXT;',
};

const updated = applyMigration(lock, migration);
writeLockFile('.', updated);
```

### 4. Commit the Lock File

Always commit `kontract.lock.json` alongside your migration files so that all environments stay in sync.

## Migration Flow Diagram

```
┌─────────────────────────────────────────┐
│  kontract migrate create <name>         │
│  → reads kontract.lock.json             │
│  → increments version                   │
│  → writes migrations/NNNN_name.ts       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Developer edits up() and down()        │
│  → SQL statements for schema change     │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  Run migration against database         │
│  → applyMigration() updates lock file   │
│  → commit lock + migration to git       │
└─────────────────────────────────────────┘
```

## API Reference

| Function | Description |
|----------|-------------|
| `createMigration(cwd, name)` | Creates a new migration file and returns `{ path, version }` |
| `diffSchemas(old, new)` | Compares schemas, returns `{ safe, changes }` |
| `generateSQLAddField(ptr, field, type)` | Generates `ALTER TABLE ... ADD COLUMN` SQL |
| `readLockFile(cwd)` | Reads `kontract.lock.json`, returns `null` if not found |
| `writeLockFile(cwd, lock)` | Writes `kontract.lock.json` |
| `createEmptyLockFile()` | Returns a fresh lock file with version 0 |
| `applyMigration(lock, migration)` | Appends a migration to the lock file and bumps version |
