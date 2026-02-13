# Overview

Konstract structures business logic around events, with compile‑time constraints and minimal‑privilege runtime access. The goal is clean front‑/back‑end boundaries, permission minimization, and consistent RPC plus event delivery.

## Design Principles

- Minimal privilege: Storage Proxy only touches storage/transactions tables
- Visibility: MVCC reads respect txid and delete markers
- Compile‑time boundary: @backend is the single entry for remote calls
- Filtered execution: middleware is trimmed by prefix/egroup/endpoints
- Encrypted channel: Raystream prefers chacha20‑poly1305
- Event format: SSE outputs use a unified payload

## Execution Flow

1. Declare backend functions with @backend
2. The compiler extracts metadata and generates RPC stubs/routes
3. The runtime executes through middleware with minimal storage access
4. Events are emitted in a consistent format for subscription

## Continue Reading

- [Runtime](/architecture/runtime)
- [Compiler](/architecture/compiler)
- [Storage & Migrations](/architecture/storage)
