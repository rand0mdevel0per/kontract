import { describe, it, expect } from 'vitest';
import { verifyAccess, checkTablePermission, checkFieldPermissions, perms } from '../src/security/permissions';

describe('perms constants', () => {
  it('has correct bit values', () => {
    expect(perms.R__).toBe(0b100);
    expect(perms._W_).toBe(0b010);
    expect(perms.__X).toBe(0b001);
    expect(perms.RW_).toBe(0b110);
    expect(perms.R_X).toBe(0b101);
    expect(perms._WX).toBe(0b011);
    expect(perms.RWX).toBe(0b111);
  });

  it('combinations are consistent', () => {
    expect(perms.RW_).toBe(perms.R__ | perms._W_);
    expect(perms.R_X).toBe(perms.R__ | perms.__X);
    expect(perms._WX).toBe(perms._W_ | perms.__X);
    expect(perms.RWX).toBe(perms.R__ | perms._W_ | perms.__X);
  });
});

describe('permissions', () => {
  it('verifyAccess checks owner and mask', () => {
    const ctx = { sid: 's', owner: 'me', perm: 0b110 };
    expect(() => verifyAccess(ctx, 0b100, 'me')).not.toThrow();
    expect(() => verifyAccess(ctx, 0b001, 'me')).toThrow();
    expect(() => verifyAccess(ctx, 0b100, 'you')).toThrow();
  });

  it('table permission checks', () => {
    expect(() => checkTablePermission(0b100, 'read')).not.toThrow();
    expect(() => checkTablePermission(0b100, 'write')).toThrow();
  });

  it('field permission checks', () => {
    const data = { email: 'a', name: 'b' };
    const perms = { email: 0b100, name: 0b110 };
    expect(() => checkFieldPermissions(data, perms, 0b010)).not.toThrow();
    expect(() => checkFieldPermissions({ name: 'c' }, perms, 0b000)).toThrow();
  });
});
