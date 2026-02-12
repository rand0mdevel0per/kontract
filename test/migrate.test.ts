import { describe, it, expect } from 'vitest';
import { diffSchemas, generateSQLAddField } from '../src/cli/migrate';

describe('migrate', () => {
  it('detects safe add_field changes', () => {
    const oldS = { id: { type: 'string', primkey: true } };
    const newS = { id: { type: 'string', primkey: true }, email: { type: 'string' } };
    const d = diffSchemas(oldS, newS);
    expect(d.safe).toBe(true);
    expect(d.changes[0].field).toBe('email');
  });

  it('rejects dangerous type change', () => {
    const oldS = { age: { type: 'number' } };
    const newS = { age: { type: 'string' } };
    const d = diffSchemas(oldS, newS);
    expect(d.safe).toBe(false);
  });

  it('generates SQL for add_field', () => {
    const sql = generateSQLAddField('tbl_users_abc', 'email', 'string');
    expect(sql).toContain('ALTER TABLE tbl_users_abc');
  });

  it('maps boolean and unknown types', () => {
    const sqlBool = generateSQLAddField('tbl_users_abc', 'active', 'boolean');
    expect(sqlBool).toContain('BOOLEAN');
    const sqlUnknown = generateSQLAddField('tbl_users_abc', 'meta', 'json');
    expect(sqlUnknown).toContain('TEXT');
  });

  it('detects field removal as unsafe', () => {
    const oldS = { id: { type: 'string' }, email: { type: 'string' } };
    const newS = { id: { type: 'string' } };
    const d = diffSchemas(oldS, newS);
    expect(d.safe).toBe(false);
  });
});
