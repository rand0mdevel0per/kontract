# Konstract

Konstract is an event‑driven, full‑stack TypeScript framework prototype focused on minimum database privileges, secure server execution, and clear compile‑time boundaries. This repository includes the runtime, compiler prototype, migrations, middleware, and high‑coverage tests with CI.

## Highlights

- Storage Proxy + MVCC: read/write visibility rules with minimal database access
- @backend compiler: extract decorator metadata, generate RPC stubs and routes
- Middleware filtering and inlining: prefix/egroup/endpoints filtering with next() chaining
- Raystream encryption: prefers chacha20‑poly1305 with AES‑GCM fallback
- SSE events: standardized event output
- Migration + type extraction: schema diff and StorageRegistry generation

## Quick Start

```bash
npm install
npm run lint
npm run typecheck
npm run test
```

## Documentation

```bash
npm run docs:dev
```

Build output: docs/.vitepress/dist  
Cloudflare Pages: build command `npm run docs:build`, output directory `docs/.vitepress/dist`

## Project Layout

- src/runtime: sessions and transaction management
- src/storage: Storage Proxy and ptr mapping
- src/compiler: @backend extraction and registry generation
- src/middleware: filtering and inlining
- src/protocol: encryption and transport primitives
- src/events: SSE output
- src/cli: migration helpers
- test: unit tests and coverage
- docs: VitePress documentation

## Scripts

- `npm run build`
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run docs:dev`
- `npm run docs:build`
- `npm run docs:preview`

## CI

GitHub Actions runs lint, typecheck, and tests on PRs and main branch pushes to enforce quality and coverage.

## License

MIT
