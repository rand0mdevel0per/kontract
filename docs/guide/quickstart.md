# Quickstart

## Requirements

- Node.js 20+
- npm 9+

## Install Dependencies

```bash
npm install
```

## Quality Checks and Tests

```bash
npm run lint
npm run typecheck
npm run test
```

## Run the Docs Site

```bash
npm run docs:dev
```

## Production Build

```bash
npm run docs:build
```

Build output is docs/.vitepress/dist, suitable for Cloudflare Pages.

## Cloudflare Pages Settings

- Build command: `npm run docs:build`
- Output directory: `docs/.vitepress/dist`

## Wrangler Deploy

```bash
npm run docs:build
npx wrangler pages deploy docs/.vitepress/dist --project-name konstract
```
