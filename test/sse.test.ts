import { describe, it, expect } from 'vitest';
import { formatSSE } from '../src/events/sse';

describe('sse', () => {
  it('formats event correctly', () => {
    const s = formatSSE({ type: 'insert', id: '1', data: { a: 1 } });
    expect(s.startsWith('data: ')).toBe(true);
    expect(s.endsWith('\n\n')).toBe(true);
  });
});
