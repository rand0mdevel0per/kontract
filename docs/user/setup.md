# Setup

## Prerequisites

- Node.js 20+
- npm 9+
- PostgreSQL 14+ (for production)

## Install

```bash
npm install
```

## Verify

```bash
npm run lint
npm run typecheck
npm run test
```

## Database Setup

Create the required tables:

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

Then create data tables following the Kontract schema pattern (see [Storage & Migrations](/architecture/storage)).
