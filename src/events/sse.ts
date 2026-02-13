export type ChangeEvent = { type: 'insert' | 'update' | 'delete'; id: string; data?: unknown; oldData?: unknown };

export function formatSSE(e: ChangeEvent): string {
  return `data: ${JSON.stringify(e)}\n\n`;
}

export type SubscriptionHandler = (event: ChangeEvent) => void;

export class EventBus {
  private listeners = new Map<string, Set<SubscriptionHandler>>();

  subscribe(table: string, handler: SubscriptionHandler): () => void {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table)!.add(handler);
    return () => {
      this.listeners.get(table)?.delete(handler);
    };
  }

  emit(table: string, event: ChangeEvent): void {
    const handlers = this.listeners.get(table);
    if (handlers) {
      for (const h of handlers) {
        h(event);
      }
    }
  }

  listenerCount(table: string): number {
    return this.listeners.get(table)?.size ?? 0;
  }
}
