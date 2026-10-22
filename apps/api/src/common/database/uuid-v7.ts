import { randomBytes } from 'node:crypto';

/**
 * Creates UUID version 7 ids (RFC 9562): the first 48 bits are the time in
 * milliseconds, so ids sort by creation time and index well (Database Design, Conventions).
 */
export class UuidV7 {
  static create(now: number = Date.now()): string {
    const bytes = randomBytes(16);
    bytes.writeUIntBE(now, 0, 6);
    bytes[6] = (bytes[6] & 0x0f) | 0x70;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = bytes.toString('hex');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  static isUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}
