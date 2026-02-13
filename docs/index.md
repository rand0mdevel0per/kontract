---
layout: home

hero:
  name: Kontract
  text: One Database, One World
  tagline: Serverless full-stack TypeScript framework with minimal database privileges, end-to-end encryption, and zero-config MVCC.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/overview
    - theme: alt
      text: API Reference
      link: /dev/api

features:
  - title: Minimal Privileges
    details: Operates with exactly two PostgreSQL tables. No full DB ownership required.
  - title: Compile-Time Code Splitting
    details: "@backend functions are extracted to server bundle; typed RPC stubs generated for the client."
  - title: End-to-End Encryption
    details: raystream protocol using ECDH key exchange and ChaCha20-Poly1305 AEAD.
  - title: Zero-Config MVCC
    details: Multi-version concurrency control with automatic visibility filtering. No configuration needed.
  - title: Serverless-First
    details: Designed for Cloudflare Workers with sub-millisecond cold starts and automatic scaling.
  - title: Multi-Tenant Isolation
    details: Physical table isolation via ptr indirection. Each tenant's data is completely separated.
---
