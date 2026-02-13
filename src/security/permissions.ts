/** Permission bit constants as defined in the Kontract spec. */
export const perms = {
  R__: 0b100,
  _W_: 0b010,
  __X: 0b001,
  RW_: 0b110,
  R_X: 0b101,
  _WX: 0b011,
  RWX: 0b111
} as const;

export interface PermContext {
  sid: string;
  owner: string;
  perm: number;
}

export function verifyAccess(ctx: PermContext, requiredPerm: number, owner?: string): void {
  if (owner && owner !== ctx.owner) {
    throw new Error('Forbidden');
  }
  if ((ctx.perm & requiredPerm) !== requiredPerm) {
    throw new Error('Insufficient permissions');
  }
}

export function checkTablePermission(perms: number, operation: 'read' | 'write' | 'delete'): void {
  const required = operation === 'read' ? 0b100 : operation === 'write' ? 0b010 : 0b001;
  if (!(perms & required)) {
    throw new Error(`Cannot ${operation}`);
  }
}

export function checkFieldPermissions(data: Record<string, unknown>, fieldPerms: Record<string, number>, mask: number): void {
  for (const [field, value] of Object.entries(data)) {
    if (value !== undefined) {
      const required = fieldPerms[field] ?? 0b110;
      const writeRequired = (required & 0b010) === 0b010;
      if (writeRequired && (mask & 0b010) !== 0b010) {
        throw new Error(field);
      }
    }
  }
}
