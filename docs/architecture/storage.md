# Storage & Migrations

## Table Schema Generation

Kontract generates PostgreSQL tables from TypeScript interfaces.

### From Interface

```ts
interface User {
  @primkey id: string;
  name: string;
  @perm(perms.R__) email: string;
  age: number;
  tags: string[];
}
```

Generated SQL:

```sql
CREATE TABLE tbl_users_abc123 (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  _version INT DEFAULT 1,
  _txid BIGINT DEFAULT txid_current(),
  _owner TEXT NOT NULL,
  _deleted_txid BIGINT,
  _order BIGSERIAL,

  CHECK (data ? 'name'),
  CHECK (data ? 'email'),
  CHECK (data ? 'age')
);

CREATE INDEX idx_users_txid ON tbl_users_abc123(_txid);
CREATE INDEX idx_users_owner ON tbl_users_abc123(_owner);
```

### Without Interface

If no interface is defined, the compiler infers the schema from usage:

```ts
await env.storage.todos.push({ text: 'Buy milk', done: false });
// Infers: { _id: string; text: string; done: boolean; }
```

## StorageRegistry

Generated from type extraction to provide typed table access:

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

// Usage with full type inference
const user = await env.storage.users.get('123');
//    ^? User | null
```

## Lock File

Migration state is tracked in `kontract.lock.json`:

```json
{
  "version": 5,
  "tables": {
    "users": {
      "ptr": "tbl_users_abc123",
      "schema": {
        "id": { "type": "string", "primkey": true },
        "name": { "type": "string" },
        "email": { "type": "string", "perm": 4 }
      },
      "hash": "sha256:..."
    }
  },
  "migrations": [...]
}
```

## Migration Rules

### Safe Changes (automatic)

- Adding new fields (with DEFAULT value)
- Adding new tables
- Adding indexes
- Changing field permissions (metadata only)

```ts
const diff = diffSchemas(oldSchema, newSchema);
// diff.safe === true → auto-migrate
// diff.changes → list of { type: 'add_field', field: string }
```

Generated SQL:

```ts
generateSQLAddField('tbl_users_abc123', 'email', 'string');
// → "ALTER TABLE tbl_users_abc123 ADD COLUMN email TEXT;"
```

### Dangerous Changes (manual migration required)

- Removing fields
- Changing field types
- Changing primary key
- Renaming fields

These produce an error requiring a manual migration file.

## Manual Migration

```ts
// migrations/0006_rename_email_field.ts
import { Migration } from 'kontract/migration';

export default {
  version: 6,

  up: async (db) => {
    await db.exec(`
      ALTER TABLE tbl_users_abc123
      RENAME COLUMN old_email TO email;
    `);
    await db.updateSchema('users', {
      email: { type: 'string', perm: 0b100 }
    });
  },

  down: async (db) => {
    await db.exec(`
      ALTER TABLE tbl_users_abc123
      RENAME COLUMN email TO old_email;
    `);
  }
} satisfies Migration;
```

## Type Mapping

| TypeScript | PostgreSQL | FlatBuffers |
|-----------|-----------|------------|
| `string` | `TEXT` | `string` |
| `number` | `DOUBLE PRECISION` | `double` |
| `boolean` | `BOOLEAN` | `bool` |
| `bigint` | `BIGINT` | `int64` |
| `Date` | `BIGINT` (unix ts) | `int64` |
| `Uint8Array` | `BYTEA` | `[ubyte]` |
