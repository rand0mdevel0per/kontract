# Konstract Documentation

This site documents Konstract’s execution model, compile‑time boundaries, and minimal‑privilege runtime design. It provides both developer‑oriented reference material and user‑facing guidance.

## What You’ll Find Here

- Storage Proxy + MVCC: minimal database access with visibility control
- @backend compiler: metadata extraction, RPC stubs, and server routes
- Middleware: filtering and next() inlining model
- Raystream: end‑to‑end encryption with chacha20‑poly1305 preference
- Migrations: schema diff safety rules
- SSE events: consistent event payloads

## Start Here

- [Overview](/guide/overview)
- [Quickstart](/guide/quickstart)
- [Runtime](/architecture/runtime)
- [Compiler](/architecture/compiler)
- [Storage & Migrations](/architecture/storage)
- [Developer Docs](/dev/)
- [User Docs](/user/)

## Deployment

```bash
npm run docs:build
npx wrangler pages deploy docs/.vitepress/dist --project-name konstract
```
