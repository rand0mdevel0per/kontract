export type ChangeEvent = { type: 'insert' | 'update' | 'delete'; id: string; data?: unknown; oldData?: unknown };

export function formatSSE(e: ChangeEvent): string {
  return `data: ${JSON.stringify(e)}\n\n`;
}
