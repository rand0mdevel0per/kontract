# Features

## Storage Proxy + MVCC

Konstract exposes data access via TableProxy, backed by ptr mappings and MVCC visibility rules. Reads are scoped by currentTxid and ignore logically deleted rows.

Practical impact:

- No direct table name usage in application code
- Consistent visibility across concurrent sessions
- Safer migrations because reads are versioned

## @backend RPC

Define backend functions with @backend. The compiler generates RPC stubs and server routes with metadata for middleware and permissions.

What it gives you:

- A single, auditable remote call surface
- Route‑level metadata for policy enforcement
- Deterministic generation of client/server glue

## Middleware Filtering

Middleware runs only when its filter matches prefix, egroup, or endpoint. Matching middleware is inlined into a single handler using next().

Common use cases:

- Audit logging for egroup=admin
- Rate limiting by URL prefix
- Per‑endpoint access control

## Raystream Encryption

End‑to‑end encryption prefers chacha20‑poly1305 with AES‑GCM fallback, so it works across different OpenSSL builds.

Security posture:

- Authenticated encryption with associated data
- Nonce per message
- Key derivation isolated from application data

## SSE Events

Standardized event payloads simplify subscription and forwarding across runtimes.

Typical events:

- insert/update/delete changes
- domain events such as user.created
