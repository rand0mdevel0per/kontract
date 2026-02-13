# Installation

## Prerequisites

- Node.js 20+
- npm 9+

## Clone and Install

```bash
git clone https://github.com/rand0mdevel0per/konstract.git
cd konstract
npm install
```

## Install Dependencies

```bash
npm install
```

## Quality Gates

```bash
npm run lint
npm run typecheck
npm run test
```

## Docs Build

```bash
npm run docs:build
```

## Local Docs Preview

```bash
npm run docs:dev
```

## Wrangler Deployment (Cloudflare Pages)

```bash
npm run docs:build
npx wrangler pages deploy docs/.vitepress/dist --project-name konstract
```

Notes:

- The project name must match the Cloudflare Pages project
- Use Node.js 20+ in the build environment
