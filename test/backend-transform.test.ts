import { describe, it, expect } from 'vitest';
import { transformBackend } from '../src/compiler/backend';

describe('@backend transform', () => {
  it('generates client stub and server route', () => {
    const src = `
      class Service {
        @backend({ egroup: "api-v1" })
        async getUser(id: string) { return id; }
      }
    `;
    const res = transformBackend(src);
    expect(res.client).toContain('__kontract_rpc');
    expect(res.server).toContain('__kontract_routes.set');
    expect(res.routes[0].meta.egroup).toBe('api-v1');
  });

  it('parses boolean and numeric meta', () => {
    const src = `
      class Service {
        @backend({ secure: false, version: 1 })
        async ping() { return true; }
      }
    `;
    const res = transformBackend(src);
    const route = res.routes.find(r => r.name === 'ping')!;
    expect(route.meta.secure).toBe(false);
    expect(route.meta.version).toBe(1);
  });

  it('ignores non-decorated functions and handles anonymous class', () => {
    const src = `
      export default class {
        @backend()
        async echo() { return 1; }
      }
      async function helper() { return 0; }
    `;
    const res = transformBackend(src);
    expect(res.routes.some(r => r.name === 'echo')).toBe(true);
    expect(res.routes.some(r => r.name === 'helper')).toBe(false);
  });

  it('skips non-identifier meta keys', () => {
    const src = `
      class Service {
        @backend({ "x-y": 1, clean: true })
        async foo() { return 1; }
      }
    `;
    const res = transformBackend(src);
    const route = res.routes.find(r => r.name === 'foo')!;
    expect(route.meta.clean).toBe(true);
    expect(route.meta['x-y']).toBeUndefined();
  });

  it('handles non-object meta argument gracefully', () => {
    const src = `
      class Service {
        @backend(1)
        async bar() { return 2; }
      }
    `;
    const res = transformBackend(src);
    const route = res.routes.find(r => r.name === 'bar')!;
    expect(route.meta).toEqual({});
  });
});
