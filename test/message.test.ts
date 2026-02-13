import { describe, it, expect } from 'vitest';
import { MessageType, ErrorCode } from '../src/protocol/message';

describe('MessageType', () => {
  it('has all protocol message types', () => {
    expect(MessageType.HANDSHAKE_INIT).toBe(0x01);
    expect(MessageType.HANDSHAKE_RESPONSE).toBe(0x02);
    expect(MessageType.RPC_CALL).toBe(0x10);
    expect(MessageType.RPC_RESPONSE).toBe(0x11);
    expect(MessageType.RPC_ERROR).toBe(0x12);
    expect(MessageType.SUBSCRIBE).toBe(0x20);
    expect(MessageType.EVENT).toBe(0x21);
    expect(MessageType.HEARTBEAT).toBe(0x30);
    expect(MessageType.CLOSE).toBe(0xff);
  });
});

describe('ErrorCode', () => {
  it('has all error codes', () => {
    expect(ErrorCode.UNAUTHORIZED).toBe('UNAUTHORIZED');
    expect(ErrorCode.FORBIDDEN).toBe('FORBIDDEN');
    expect(ErrorCode.NOT_FOUND).toBe('NOT_FOUND');
    expect(ErrorCode.PERMISSION_DENIED).toBe('PERMISSION_DENIED');
    expect(ErrorCode.SESSION_EXPIRED).toBe('SESSION_EXPIRED');
    expect(ErrorCode.DECRYPTION_FAILED).toBe('DECRYPTION_FAILED');
    expect(ErrorCode.INVALID_NONCE).toBe('INVALID_NONCE');
    expect(ErrorCode.INTERNAL_ERROR).toBe('INTERNAL_ERROR');
    expect(ErrorCode.TIMEOUT).toBe('TIMEOUT');
  });
});
