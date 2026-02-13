# Overview

Kontract is a serverless full-stack TypeScript framework that follows the principle: **"One Database, One World"**. It enables complete backend functionality with access to only two PostgreSQL tables, automatic code splitting, and end-to-end encryption.

## Architecture

```
┌─────────────────────────────────────────┐
│  Frontend (Any Framework)               │
│  ├─ import { api } from '@/client'     │
│  └─ WebSocket/SSE subscription         │
└────────────┬────────────────────────────┘
             │ raystream (E2E encrypted)
             │ FlatBuffers serialization
┌────────────▼────────────────────────────┐
│  Cloudflare Workers - Gateway           │
│  ├─ Middleware chain (inlined)          │
│  ├─ Authentication & authorization      │
│  ├─ DO Session (MVCC coordination)     │
│  └─ DO KVC (global shared state)       │
└────────────┬────────────────────────────┘
             │ PostgreSQL client
┌────────────▼────────────────────────────┐
│  PostgreSQL Database                    │
│  ├─ storage (id, ptr, owner, perms)    │
│  ├─ trxs (sid, owner, create_txid)     │
│  └─ Data tables (tbl_*)                │
└─────────────────────────────────────────┘
```

## Design Principles

- **Minimal privilege**: the framework only requires access to `storage` and `trxs` tables. All data tables are accessed indirectly through ptr resolution.
- **Compile-time boundary**: `@backend` is the single decorator that marks server-side code. The compiler extracts these functions into the server bundle and replaces them with RPC stubs in the client bundle.
- **Zero-trust security**: every operation verifies session validity, owner authentication, and permission bits before execution.
- **MVCC by default**: all storage reads respect transaction visibility without any explicit configuration.
- **Encrypted transport**: the raystream protocol provides end-to-end encryption using ECDH key exchange and ChaCha20-Poly1305 AEAD.

## Request Flow

1. Client invokes a backend function with typed arguments
2. Arguments are serialized to FlatBuffers
3. Encrypted using the session key (raystream protocol)
4. Gateway decrypts and authenticates the request
5. Middleware chain executes (compile-time inlined)
6. Backend function executes with injected context
7. Response is encrypted and returned to client

## Key Innovations vs Existing Frameworks

| Feature | Kontract | Supabase | Convex | Prisma + tRPC |
|---------|----------|----------|--------|---------------|
| DB privileges | 2 tables | Full DB | Managed | Full DB |
| Code colocation | Single codebase | Separate | Limited | Separate |
| E2E encryption | raystream | TLS only | TLS only | TLS only |
| Cold start | <10ms | 100ms+ | <50ms | 500ms+ |
| Multi-tenancy | ptr isolation | RLS | Manual | Manual |

## Continue Reading

- [Runtime](/architecture/runtime) - SessionDO, MVCC, Storage Proxy
- [Compiler](/architecture/compiler) - build pipeline and decorators
- [Storage & Migrations](/architecture/storage) - schema generation
- [Security](/architecture/security) - raystream and permissions
