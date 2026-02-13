# Troubleshooting

## Storage Access Errors

**"Table X not found"**

The `storage` table doesn't have a ptr mapping for the logical table name. Insert a row:

```sql
INSERT INTO storage (id, ptr, owner, permissions) VALUES ('users', 'tbl_users_abc123', 'tenant-1', 7);
```

## Permission Denied

**"Insufficient permissions"**

The `perm` field in context doesn't satisfy the required permission bits. Check:

1. The `@backend` decorator specifies the correct `perm` value
2. The session context has matching permission bits
3. Use `perms.R__` (0b100) for read, `perms._W_` (0b010) for write, `perms.__X` (0b001) for delete

## exec() Rejects SQL

**"Cannot access other tables"**

`exec()` validates that SQL only references the current table. Remove cross-table JOINs or references. Use separate `TableProxy` instances for each table.

## Middleware Not Executing

Verify the filter matches:

- `prefixurl` must be a prefix of the request path
- `egroup` must match the route's endpoint group
- `endpoints` must include the function name

A middleware with no filter applies to all requests.

## Decorator Parsing Errors

Ensure `@backend` is used on class methods or exported functions with Babel's `decorators` plugin enabled. The parser requires `sourceType: 'module'` and `plugins: ['typescript', 'decorators']`.

## Encryption Failures

**"KONTRACT_DECRYPT_FAILED"**

- Verify the encryption key matches between encrypt and decrypt
- Ensure nonce is transmitted alongside ciphertext
- Check that the auth tag is not corrupted
- The cipher algorithm must match (both sides use `chacha20-poly1305` or both use `aes-256-gcm`)

## MVCC Visibility Issues

If records appear missing:

- Check that `currentTxid` in the context is greater than the record's `_txid`
- Verify the record doesn't have a `_deleted_txid` less than `currentTxid`
- Use `SessionDO.allocateTxid()` to get a fresh transaction ID

## Tests Fail on Coverage

Ensure all branches remain above configured thresholds (lines: 90%, statements: 90%, branches: 85%, functions: 90%). Run `npm run test` to see the coverage report and identify uncovered lines.
