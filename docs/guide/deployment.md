# Deployment

## Overview

Kontract apps run on Cloudflare Workers. The deployment unit is a single Worker script containing the gateway, middleware chain, and compiled backend routes.

```
wrangler.toml          ← Worker configuration
src/gateway.ts         ← fetch() entry point
dist/server/routes.js  ← compiled @backend handlers
```

## wrangler.toml

Minimal configuration:

```toml
name = "my-kontract-app"
main = "src/gateway.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

# Durable Object for MVCC session coordination
[durable_objects]
bindings = [
  { name = "SESSION_DO", class_name = "KontractSessionDO" },
]

[[migrations]]
tag = "v1"
new_classes = ["KontractSessionDO"]
```

## Gateway URL

Configure your production domain via routes:

```toml
[env.production]
name = "my-kontract-app"
routes = [
  { pattern = "api.example.com/*", zone_name = "example.com" }
]
```

Clients then call `https://api.example.com/rpc/<fn>` for RPC and `https://api.example.com/stream` for SSE.

If you don't own a domain, Workers provides a default URL at `https://my-kontract-app.<subdomain>.workers.dev`.

## Secrets

Set secrets via wrangler CLI (never commit these):

```bash
# PostgreSQL connection string
wrangler secret put DATABASE_URL

# 32-byte hex key for raystream E2E encryption
wrangler secret put KONTRACT_SECRET
```

| Secret | Required | Description |
|--------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string (`postgresql://user:pass@host:5432/db`) |
| `KONTRACT_SECRET` | Yes | Hex-encoded 32-byte key for ChaCha20-Poly1305 encryption |

## Database Setup

Kontract requires two system tables plus your data tables:

```sql
-- System tables (required)
CREATE TABLE storage (
  id          TEXT PRIMARY KEY,
  ptr         TEXT NOT NULL,
  owner       TEXT NOT NULL,
  permissions INT  NOT NULL DEFAULT 7
);

CREATE TABLE trxs (
  sid         TEXT    PRIMARY KEY,
  owner       TEXT    NOT NULL,
  create_txid BIGINT  NOT NULL
);

-- Data tables follow the pattern:
CREATE TABLE tbl_<name>_<hash> (
  id            TEXT PRIMARY KEY,
  data          JSONB NOT NULL DEFAULT '{}',
  _txid         BIGINT NOT NULL,
  _deleted_txid BIGINT,
  _owner        TEXT NOT NULL,
  _order        SERIAL
);
```

Register table pointers:

```sql
INSERT INTO storage (id, ptr, owner, permissions)
VALUES ('users', 'tbl_users_abc123', 'tenant-1', 7);
```

Recommended PostgreSQL providers:
- [Neon](https://neon.tech) — serverless PostgreSQL, free tier
- [Supabase](https://supabase.com) — PostgreSQL with dashboard
- [Railway](https://railway.app) — simple deployment

## Deploy Commands

```bash
# Local development
wrangler dev

# Deploy to production
wrangler deploy --env production

# View logs
wrangler tail --env production
```

## Environment-Specific Config

```toml
# Development (local)
[env.development]
name = "my-app-dev"

# Staging
[env.staging]
name = "my-app-staging"

# Production
[env.production]
name = "my-app"
routes = [
  { pattern = "api.example.com/*", zone_name = "example.com" }
]
```

## CI/CD

Example GitHub Actions workflow:

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm test
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          command: deploy --env production
```

## Node.js Deployment (non-Cloudflare)

Kontract can run on any Node.js runtime using the adapter layer. Replace Cloudflare-specific primitives (DO, KV) with TiKV-backed implementations.

### Architecture

```
Node.js Instance A ──┐
Node.js Instance B ──┤── TiKV Cluster ── PostgreSQL
Node.js Instance C ──┘
```

Each node:
1. Runs DO logic locally (in-process memory)
2. Persists state to TiKV for cross-node visibility
3. Uses `SharedStorage(TiKVDOStub, TiKVKVStore)` for the two-tier cache
4. Connects to PostgreSQL directly (no Hyperdrive needed)

### Setup

```ts
import {
  createTiKVAdapter,
  createGateway,
  SharedStorage,
} from '@rand0mdevel0per/kontract';

// 1. Provide a TiKV client (implement TiKVClient interface)
const tikvClient = createYourTiKVClient('pd-host:2379');

// 2. Create adapter
const { doStub, kv } = createTiKVAdapter({ client: tikvClient });
const shared = new SharedStorage(doStub, kv);

// 3. Register your @backend routes
const routes = new Map();
routes.set('getUser', {
  handler: async (ctx, args) => { /* ... */ },
  meta: { perm: 0b100 },
});

// 4. Start the gateway
const server = createGateway({
  adapter: { doStub, kv, pg: myPgPool, routes },
  port: 8787,
});
```

### TiKVClient Interface

Implement this interface to connect Kontract to your TiKV cluster:

```ts
interface TiKVClient {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  scan(prefix: string, limit: number): Promise<Array<{ key: string; value: string }>>;
}
```

Use `@grpc/grpc-js` with TiKV proto definitions, or any TiKV-compatible proxy.

### RuntimeAdapter Interface

For deploying to platforms beyond Cloudflare and Node.js/TiKV, implement `RuntimeAdapter`:

```ts
interface RuntimeAdapter {
  doStub: DOStub;    // In-process state (DO equivalent)
  kv: KVStore;       // Persistent KV (KV equivalent)
  pg: PGClient;      // PostgreSQL client
  routes: Map<string, RouteHandler>;
}
```

### RPC Endpoint

The Node.js gateway serves `@backend` functions at:

```
POST /rpc/<functionName>
```

Request body is the arguments array (or a single value wrapped in an array). Response:

```json
{ "result": <return value> }
```

Health check at `GET /health` returns `{ "status": "ok", "routes": <count> }`.

## Self-Hosted Deployment

For private cloud or on-premises environments, Kontract runs as a standard Node.js HTTP server backed by PostgreSQL and (optionally) TiKV.

### Docker

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
EXPOSE 8787
CMD ["node", "dist/server.js"]
```

```bash
docker build -t kontract-app .
docker run -d \
  -p 8787:8787 \
  -e DATABASE_URL="postgresql://user:pass@db:5432/kontract" \
  -e KONTRACT_SECRET="your-32-byte-hex-key" \
  --name kontract \
  kontract-app
```

### Docker Compose

Full stack with PostgreSQL and TiKV:

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "8787:8787"
    environment:
      DATABASE_URL: postgresql://kontract:kontract@postgres:5432/kontract
      KONTRACT_SECRET: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      TIKV_PD_ENDPOINT: "pd:2379"
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: kontract
      POSTGRES_PASSWORD: kontract
      POSTGRES_DB: kontract
    volumes:
      - pg_data:/var/lib/postgresql/data
      - ./sql/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"

  # Optional: TiKV for multi-node DO state
  pd:
    image: pingcap/pd:latest
    command: --name=pd --client-urls=http://0.0.0.0:2379

  tikv:
    image: pingcap/tikv:latest
    command: --pd-endpoints=pd:2379
    depends_on:
      - pd

volumes:
  pg_data:
```

### systemd

For bare-metal or VM deployment:

```ini
# /etc/systemd/system/kontract.service
[Unit]
Description=Kontract Gateway
After=network.target postgresql.service

[Service]
Type=simple
User=kontract
WorkingDirectory=/opt/kontract
ExecStart=/usr/bin/node dist/server.js
Restart=on-failure
RestartSec=5s
Environment=NODE_ENV=production
EnvironmentFile=/etc/kontract/env

[Install]
WantedBy=multi-user.target
```

Environment file (`/etc/kontract/env`):

```bash
DATABASE_URL=postgresql://kontract:password@localhost:5432/kontract
KONTRACT_SECRET=your-32-byte-hex-key
PORT=8787
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable kontract
sudo systemctl start kontract
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kontract
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kontract
  template:
    metadata:
      labels:
        app: kontract
    spec:
      containers:
        - name: kontract
          image: your-registry/kontract-app:latest
          ports:
            - containerPort: 8787
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: kontract-secrets
                  key: database-url
            - name: KONTRACT_SECRET
              valueFrom:
                secretKeyRef:
                  name: kontract-secrets
                  key: kontract-secret
          readinessProbe:
            httpGet:
              path: /health
              port: 8787
            initialDelaySeconds: 5
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /health
              port: 8787
            initialDelaySeconds: 10
            periodSeconds: 30
---
apiVersion: v1
kind: Service
metadata:
  name: kontract
spec:
  selector:
    app: kontract
  ports:
    - port: 80
      targetPort: 8787
  type: ClusterIP
---
apiVersion: v1
kind: Secret
metadata:
  name: kontract-secrets
type: Opaque
stringData:
  database-url: postgresql://kontract:password@postgres:5432/kontract
  kontract-secret: "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
```

### Multi-Node Considerations

When running multiple Kontract instances (replicas), keep in mind:

| Concern | Solution |
|---------|----------|
| DO state sharing | Use TiKV as the `DOStub` backend instead of `MemoryDOStub` |
| Session affinity | Not required — JWT tokens are stateless, verified on any node |
| Database connections | Use connection pooling (PgBouncer, Pgpool-II) |
| Health checks | `GET /health` returns route count and status |
| Cold starts | Enable lazy route loading to minimize startup overhead |

