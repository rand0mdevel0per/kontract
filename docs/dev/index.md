# Developer Documentation

Implementation-level reference for contributors and integrators.

## Architecture

```
Client
  │  RPC / SSE
  ▼
Runtime ── Middleware ── @backend Routes
  │
  ▼
Storage Proxy (ptr) ── MVCC ── PostgreSQL
```

## Request Flow

```
Client Call
  │
  ▼
RPC Stub (__kontract_rpc)
  │
  ▼
Route Map (@backend meta)
  │
  ▼
Middleware Filter (prefixurl / egroup / endpoints)
  │
  ▼
Handler Execution
  │
  ▼
Storage Proxy → MVCC → PostgreSQL
  │
  ▼
SSE Event Emit
```

## Core Concepts

- **Minimal privilege**: storage access is gated by ptr resolution and MVCC rules
- **Explicit boundary**: `@backend` is the compiler entry point for remote calls
- **Consistent events**: SSE payloads use a unified `ChangeEvent` shape
- **Deterministic middleware**: filtered and inlined into a single handler at compile time

## Sections

- [Installation](/dev/installation)
- [Configuration](/dev/configuration)
- [API Reference](/dev/api)
- [Contributing](/dev/contributing)
