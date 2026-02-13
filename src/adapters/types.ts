/**
 * Runtime adapter interfaces for multi-platform deployment.
 * Allows Kontract to run on Cloudflare Workers, Node.js, or any
 * runtime by swapping the adapter implementation.
 */

import type { DOStub, KVStore } from '../runtime/shared';
import type { PGClient, Context } from '../storage/TableProxy';

/**
 * A resolved backend route handler.
 */
export interface RouteHandler {
  handler: (ctx: Context, args: unknown[]) => Promise<unknown>;
  meta: Record<string, unknown>;
}

/**
 * RuntimeAdapter bundles all platform-specific primitives.
 * Implement this interface to deploy Kontract on a new target.
 */
export interface RuntimeAdapter {
  /** Durable Object stub (or equivalent in-process state) */
  doStub: DOStub;

  /** KV store (Cloudflare KV, TiKV, Redis, etc.) */
  kv: KVStore;

  /** PostgreSQL client */
  pg: PGClient;

  /** Registered @backend route handlers */
  routes: Map<string, RouteHandler>;
}

/**
 * Options for the Node.js HTTP gateway.
 */
export interface GatewayOptions {
  adapter: RuntimeAdapter;

  /** Port to listen on (default: 8787, matching wrangler default) */
  port?: number;

  /** Host to bind to (default: '0.0.0.0') */
  host?: string;

  /** JWT secret for auth middleware (KONTRACT_SECRET) */
  secret?: string;

  /** Enable CORS (default: true) */
  cors?: boolean;
}

/**
 * Gateway request — platform-agnostic HTTP request.
 */
export interface GatewayRequest {
  method: string;
  path: string;
  headers: Record<string, string>;
  body: unknown;
}

/**
 * Gateway response — platform-agnostic HTTP response.
 */
export interface GatewayResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}
