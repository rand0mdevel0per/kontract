import { describe, it, expect } from 'vitest';
import { handleRequest } from '../src/adapters/node-gateway';
import type { RuntimeAdapter, GatewayRequest, RouteHandler } from '../src/adapters/types';
import { MemoryDOStub } from '../src/runtime/shared';
import { HttpError } from '../src/runtime/http';

function createMockAdapter(routes?: Map<string, RouteHandler>): RuntimeAdapter {
  return {
    doStub: new MemoryDOStub(),
    kv: {
      async get() { return null; },
      async put() {},
      async delete() {},
    },
    pg: {
      async query() { return { rows: [] }; },
    },
    routes: routes ?? new Map(),
  };
}

function makeReq(overrides: Partial<GatewayRequest> = {}): GatewayRequest {
  return {
    method: 'GET',
    path: '/',
    headers: {},
    body: null,
    ...overrides,
  };
}

describe('handleRequest', () => {
  it('responds to OPTIONS with 204', async () => {
    const adapter = createMockAdapter();
    const res = await handleRequest(makeReq({ method: 'OPTIONS' }), adapter);
    expect(res.status).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
  });

  it('serves health check', async () => {
    const adapter = createMockAdapter();
    const res = await handleRequest(makeReq({ path: '/health' }), adapter);
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('ok');
    expect(body.routes).toBe(0);
  });

  it('serves healthz alias', async () => {
    const adapter = createMockAdapter();
    const res = await handleRequest(makeReq({ path: '/healthz' }), adapter);
    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown paths', async () => {
    const adapter = createMockAdapter();
    const res = await handleRequest(makeReq({ path: '/unknown' }), adapter);
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body).error).toBe('NOT_FOUND');
  });

  it('returns 404 for unknown RPC function', async () => {
    const adapter = createMockAdapter();
    const res = await handleRequest(
      makeReq({ method: 'POST', path: '/rpc/nonexistent', body: [] }),
      adapter,
    );
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body).message).toContain('nonexistent');
  });

  it('dispatches RPC call to registered handler', async () => {
    const routes = new Map<string, RouteHandler>();
    routes.set('add', {
      handler: async (_ctx, args) => {
        const [a, b] = args as [number, number];
        return a + b;
      },
      meta: { perm: 0b111 },
    });
    const adapter = createMockAdapter(routes);

    const res = await handleRequest(
      makeReq({ method: 'POST', path: '/rpc/add', body: [3, 4] }),
      adapter,
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).result).toBe(7);
  });

  it('wraps non-array body in array', async () => {
    const routes = new Map<string, RouteHandler>();
    routes.set('echo', {
      handler: async (_ctx, args) => args[0],
      meta: {},
    });
    const adapter = createMockAdapter(routes);

    const res = await handleRequest(
      makeReq({ method: 'POST', path: '/rpc/echo', body: 'hello' }),
      adapter,
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).result).toBe('hello');
  });

  it('returns HttpError status on handler failure', async () => {
    const routes = new Map<string, RouteHandler>();
    routes.set('fail', {
      handler: async () => { throw new HttpError('Forbidden', 403, 'FORBIDDEN'); },
      meta: {},
    });
    const adapter = createMockAdapter(routes);

    const res = await handleRequest(
      makeReq({ method: 'POST', path: '/rpc/fail', body: [] }),
      adapter,
    );
    expect(res.status).toBe(403);
    expect(JSON.parse(res.body).error).toBe('FORBIDDEN');
  });

  it('returns 500 on unexpected error', async () => {
    const routes = new Map<string, RouteHandler>();
    routes.set('crash', {
      handler: async () => { throw new Error('unexpected'); },
      meta: {},
    });
    const adapter = createMockAdapter(routes);

    const res = await handleRequest(
      makeReq({ method: 'POST', path: '/rpc/crash', body: [] }),
      adapter,
    );
    expect(res.status).toBe(500);
    expect(JSON.parse(res.body).error).toBe('INTERNAL_ERROR');
  });

  it('sets x-owner header as transaction owner', async () => {
    const routes = new Map<string, RouteHandler>();
    routes.set('whoami', {
      handler: async (ctx) => ctx.owner,
      meta: {},
    });
    const adapter = createMockAdapter(routes);

    const res = await handleRequest(
      makeReq({
        method: 'POST',
        path: '/rpc/whoami',
        body: [],
        headers: { 'x-owner': 'user_123' },
      }),
      adapter,
    );
    expect(res.status).toBe(200);
    expect(JSON.parse(res.body).result).toBe('user_123');
  });

  it('defaults to anonymous owner', async () => {
    const routes = new Map<string, RouteHandler>();
    routes.set('whoami', {
      handler: async (ctx) => ctx.owner,
      meta: {},
    });
    const adapter = createMockAdapter(routes);

    const res = await handleRequest(
      makeReq({ method: 'POST', path: '/rpc/whoami', body: [] }),
      adapter,
    );
    expect(JSON.parse(res.body).result).toBe('anonymous');
  });

  it('reports route count in health', async () => {
    const routes = new Map<string, RouteHandler>();
    routes.set('a', { handler: async () => 1, meta: {} });
    routes.set('b', { handler: async () => 2, meta: {} });
    const adapter = createMockAdapter(routes);

    const res = await handleRequest(makeReq({ path: '/health' }), adapter);
    expect(JSON.parse(res.body).routes).toBe(2);
  });
});
