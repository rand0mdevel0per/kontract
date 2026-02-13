import { describe, it, expect } from 'vitest';
import { HttpResp, HttpError, UnauthorizedError, ForbiddenError, NotFoundError, PermissionError } from '../src/runtime/http';

describe('HttpResp', () => {
  it('ok creates 200 response', () => {
    const r = HttpResp.ok({ id: '1' });
    expect(r.status).toBe(200);
    expect(r.data).toEqual({ id: '1' });
  });

  it('created creates 201 response', () => {
    const r = HttpResp.created({ id: '1' });
    expect(r.status).toBe(201);
  });

  it('noContent creates 204 response', () => {
    const r = HttpResp.noContent();
    expect(r.status).toBe(204);
    expect(r.data).toBeNull();
  });

  it('redirect creates 302 with Location header', () => {
    const r = HttpResp.redirect('https://example.com');
    expect(r.status).toBe(302);
    expect(r.headers.Location).toBe('https://example.com');
  });

  it('constructor accepts custom headers', () => {
    const r = new HttpResp('body', 200, { 'X-Custom': 'yes' });
    expect(r.headers['X-Custom']).toBe('yes');
  });
});

describe('HttpError hierarchy', () => {
  it('HttpError has status and code', () => {
    const e = new HttpError('fail', 500, 'INTERNAL');
    expect(e.message).toBe('fail');
    expect(e.status).toBe(500);
    expect(e.code).toBe('INTERNAL');
    expect(e).toBeInstanceOf(Error);
  });

  it('UnauthorizedError defaults to 401', () => {
    const e = new UnauthorizedError();
    expect(e.status).toBe(401);
    expect(e.code).toBe('UNAUTHORIZED');
    expect(e).toBeInstanceOf(HttpError);
  });

  it('ForbiddenError defaults to 403', () => {
    const e = new ForbiddenError();
    expect(e.status).toBe(403);
    expect(e.code).toBe('FORBIDDEN');
  });

  it('NotFoundError defaults to 404', () => {
    const e = new NotFoundError();
    expect(e.status).toBe(404);
    expect(e.code).toBe('NOT_FOUND');
  });

  it('PermissionError includes field name', () => {
    const e = new PermissionError('email');
    expect(e.status).toBe(403);
    expect(e.code).toBe('PERMISSION_DENIED');
    expect(e.message).toContain('email');
  });

  it('custom message on UnauthorizedError', () => {
    const e = new UnauthorizedError('token expired');
    expect(e.message).toBe('token expired');
  });
});
