import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

export interface RPCCall {
  method: string;
  args: Uint8Array;
  metadata: Record<string, string>;
}

export function hkdf(input: Uint8Array, info: string, len: number): Uint8Array {
  const h = createHash('sha256');
  h.update(Buffer.from(input));
  h.update(Buffer.from(info));
  const out = h.digest();
  return out.subarray(0, len);
}

function pickCipher(): 'aes-256-gcm' | 'chacha20-poly1305' {
  // Prefer chacha20-poly1305 if supported by OpenSSL build
  try {
    createCipheriv('chacha20-poly1305', Buffer.alloc(32, 0), Buffer.alloc(12, 0));
    return 'chacha20-poly1305';
  } catch {
    return 'aes-256-gcm';
  }
}

export function encrypt(payload: Uint8Array, key: Uint8Array): { nonce: Uint8Array; data: Uint8Array; tag: Uint8Array } {
  const nonce = randomBytes(12);
  const alg = pickCipher();
  const cipher = createCipheriv(alg, Buffer.from(key), nonce);
  const enc = Buffer.concat([cipher.update(Buffer.from(payload)), cipher.final()]);
  const tag = getAuthTag(cipher);
  return { nonce, data: enc, tag };
}

export function decrypt(encrypted: { nonce: Uint8Array; data: Uint8Array; tag: Uint8Array }, key: Uint8Array): Uint8Array {
  const alg = pickCipher();
  const decipher = createDecipheriv(alg, Buffer.from(key), Buffer.from(encrypted.nonce));
  setAuthTag(decipher, Buffer.from(encrypted.tag));
  const dec = Buffer.concat([decipher.update(Buffer.from(encrypted.data)), decipher.final()]);
  return dec;
}

function getAuthTag(c: unknown): Buffer {
  const obj = c as { getAuthTag: () => Buffer };
  return obj.getAuthTag();
}

function setAuthTag(d: unknown, tag: Buffer) {
  const obj = d as { setAuthTag: (t: Buffer) => void };
  obj.setAuthTag(tag);
}
