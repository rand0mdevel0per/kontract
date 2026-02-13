# Compiler

The compiler uses @backend as the entry point to extract metadata and generate client RPC stubs and server routes, keeping the execution boundary explicit.

## Artifacts

- routes: server‑side route registrations
- client stubs: uniform calls through __kontract_rpc
- server map: function name to handler + meta

## Decorator Metadata

Fields such as egroup and perm are parsed from @backend arguments for grouping, permissions, and middleware filtering.

## Middleware Inlining

- Filters: prefixurl / egroup / endpoints
- Inlining: constructs a single handler through next() chaining
