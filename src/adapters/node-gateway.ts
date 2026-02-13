/**
 * Standalone Node.js HTTP gateway for non-Cloudflare deployments.
 * Replaces the CF Workers fetch handler with a plain http.Server.
 *
 * Uses the same RuntimeAdapter + auth/middleware pipeline.
 */

import { createServer, type IncomingMessage, type ServerResponse, type Server } from 'http';
import type { RuntimeAdapter, GatewayOptions, GatewayRequest, GatewayResponse } from './types';
import { SessionDO } from '../runtime/SessionDO';
import { HttpError } from '../runtime/http';

// ── Request parsing ──────────────────────────────────────

function parseHeaders(raw: IncomingMessage['headers']): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.join(', ');
  }
  return out;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// ── Gateway dispatch ─────────────────────────────────────

const sessionDO = new SessionDO();

/**
 * Handle a single gateway request (platform-agnostic).
 * Routes to @backend handlers registered in the adapter.
 */
export async function handleRequest(
  req: GatewayRequest,
  adapter: RuntimeAdapter,
): Promise<GatewayResponse> {
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Preflight
  if (req.method === 'OPTIONS') {
    return { status: 204, headers: corsHeaders, body: '' };
  }

  // Health check
  if (req.path === '/health' || req.path === '/healthz') {
    return {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
      body: JSON.stringify({ status: 'ok', routes: adapter.routes.size }),
    };
  }

  // RPC dispatch: POST /rpc/:functionName
  const rpcMatch = req.path.match(/^\/rpc\/([a-zA-Z0-9_]+)$/);
  if (rpcMatch && req.method === 'POST') {
    const fnName = rpcMatch[1];
    const route = adapter.routes.get(fnName);
    if (!route) {
      return {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: 'NOT_FOUND', message: `Route '${fnName}' not found` }),
      };
    }

    // Build context
    const tx = await sessionDO.beginTransaction(req.headers['x-owner'] ?? 'anonymous');
    const ctx = {
      ...tx,
      perm: typeof route.meta.perm === 'number' ? route.meta.perm : 0b111,
      method: req.method,
      path: req.path,
      headers: req.headers,
      route: { name: fnName, egroup: route.meta.egroup as string | undefined },
    };

    try {
      const args = Array.isArray(req.body) ? req.body : [req.body];
      const result = await route.handler(ctx, args);
      await sessionDO.commit(tx.sid);
      return {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ result }),
      };
    } catch (err) {
      if (err instanceof HttpError) {
        return {
          status: err.status,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
          body: JSON.stringify({ error: err.code, message: err.message }),
        };
      }
      return {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
        body: JSON.stringify({ error: 'INTERNAL_ERROR', message: 'Internal server error' }),
      };
    }
  }

  return {
    status: 404,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify({ error: 'NOT_FOUND', message: 'Not found' }),
  };
}

// ── HTTP Server ──────────────────────────────────────────

/**
 * Create a standalone Node.js HTTP server that serves as the
 * Kontract gateway. Drop-in replacement for CF Workers.
 *
 * ```ts
 * import { createGateway, createTiKVAdapter } from 'kontract';
 *
 * const { doStub, kv } = createTiKVAdapter({ client: myTiKVClient });
 * const server = createGateway({
 *   adapter: { doStub, kv, pg: myPgPool, routes },
 *   port: 8787,
 * });
 * ```
 */
export function createGateway(options: GatewayOptions): Server {
  const { adapter, port = 8787, host = '0.0.0.0', cors = true } = options;

  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const bodyRaw = await readBody(req);
      let body: unknown = null;
      if (bodyRaw) {
        try { body = JSON.parse(bodyRaw); } catch { body = bodyRaw; }
      }

      const gatewayReq: GatewayRequest = {
        method: req.method ?? 'GET',
        path: req.url ?? '/',
        headers: parseHeaders(req.headers),
        body,
      };

      const gatewayRes = await handleRequest(gatewayReq, adapter);

      if (!cors) {
        delete gatewayRes.headers['Access-Control-Allow-Origin'];
        delete gatewayRes.headers['Access-Control-Allow-Methods'];
        delete gatewayRes.headers['Access-Control-Allow-Headers'];
      }

      res.writeHead(gatewayRes.status, gatewayRes.headers);
      res.end(gatewayRes.body);
    } catch {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'INTERNAL_ERROR' }));
    }
  });

  server.listen(port, host);
  return server;
}
