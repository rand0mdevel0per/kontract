import { describe, it, expect } from 'vitest';
import { formatSSE, EventBus } from '../src/events/sse';

describe('sse', () => {
  it('formats event correctly', () => {
    const s = formatSSE({ type: 'insert', id: '1', data: { a: 1 } });
    expect(s.startsWith('data: ')).toBe(true);
    expect(s.endsWith('\n\n')).toBe(true);
  });
});

describe('EventBus', () => {
  it('subscribe and emit', () => {
    const bus = new EventBus();
    const received: unknown[] = [];
    bus.subscribe('users', (e) => received.push(e));
    bus.emit('users', { type: 'insert', id: '1', data: { name: 'A' } });
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual({ type: 'insert', id: '1', data: { name: 'A' } });
  });

  it('unsubscribe stops receiving', () => {
    const bus = new EventBus();
    const received: unknown[] = [];
    const unsub = bus.subscribe('users', (e) => received.push(e));
    bus.emit('users', { type: 'insert', id: '1' });
    unsub();
    bus.emit('users', { type: 'insert', id: '2' });
    expect(received).toHaveLength(1);
  });

  it('listenerCount reflects subscriptions', () => {
    const bus = new EventBus();
    expect(bus.listenerCount('users')).toBe(0);
    const unsub = bus.subscribe('users', () => {});
    expect(bus.listenerCount('users')).toBe(1);
    unsub();
    expect(bus.listenerCount('users')).toBe(0);
  });

  it('emitting to table with no listeners does not throw', () => {
    const bus = new EventBus();
    expect(() => bus.emit('ghost', { type: 'delete', id: '1' })).not.toThrow();
  });
});
