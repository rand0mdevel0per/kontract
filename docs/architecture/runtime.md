# Runtime

The runtime manages sessions, permissions, MVCC reads/writes, and event delivery. Its core objective is minimal database privileges with concurrency safety.

## SessionDO

- Allocates txid and maintains session context
- MVCC reads use currentTxid to filter visibility
- Deletes are tracked via _deleted_txid for visibility checks

## Storage Proxy

- Uses ptr to map to the real table name
- Only touches storage/transactions to resolve ptr and tx metadata
- Caches ptr to reduce metadata lookups

## Event Channel

- Events are emitted in an SSE‑friendly payload
- The same structure can be reused for subscriptions and forwarding
