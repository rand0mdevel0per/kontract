# Storage & Migrations

StorageRegistry is generated from type extraction to expose typed table access. The migration layer uses schema diffs to determine safe changes and emits SQL snippets.

## StorageRegistry

- Generates registry keys from interfaces
- Runtime resolves TableProxy by key with type safety

## Migration Rules

- Field additions: safe changes
- Field removal/type changes: unsafe changes
- SQL generation: ALTER TABLE ADD COLUMN

## Design Goals

- Privilege reduction: real table names are hidden behind ptr
- Risk control: only safe schema evolution is allowed by default
