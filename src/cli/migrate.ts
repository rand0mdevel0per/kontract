export type Schema = Record<string, { type: string; primkey?: boolean; perm?: number }>;
export interface LockFile {
  version: number;
  tables: Record<string, { ptr: string; schema: Schema; hash: string }>;
  migrations: Array<{ version: number; changes: Array<{ type: string; table: string; field?: string; fieldType?: string }>; sql: string }>;
}

export function diffSchemas(oldS: Schema, newS: Schema): { safe: boolean; changes: Array<{ type: string; field: string }> } {
  const changes: Array<{ type: string; field: string }> = [];
  for (const k of Object.keys(newS)) {
    if (!oldS[k]) changes.push({ type: 'add_field', field: k });
    else if (oldS[k].type !== newS[k].type) return { safe: false, changes: [] };
  }
  for (const k of Object.keys(oldS)) {
    if (!newS[k]) return { safe: false, changes: [] };
  }
  return { safe: true, changes };
}

export function generateSQLAddField(ptr: string, field: string, fieldType: string): string {
  return `ALTER TABLE ${ptr} ADD COLUMN ${field} ${mapType(fieldType)};`;
}

function mapType(t: string): string {
  switch (t) {
    case 'string': return 'TEXT';
    case 'number': return 'DOUBLE PRECISION';
    case 'boolean': return 'BOOLEAN';
    default: return 'TEXT';
  }
}
