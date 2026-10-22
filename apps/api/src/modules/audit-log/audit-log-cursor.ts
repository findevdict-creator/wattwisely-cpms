import { UuidV7 } from '@wattwisely/db';

/**
 * The opaque next_cursor of the audit log list: the time and id of the last entry
 * on the page. The next page starts right after it, which stays fast on a huge table.
 */
export class AuditLogCursor {
  constructor(
    readonly occurredAt: Date,
    readonly id: string,
  ) {}

  static parse(value: string): AuditLogCursor | null {
    const [time, id] = Buffer.from(value, 'base64url').toString('utf8').split('|');
    const occurredAt = new Date(time ?? '');
    return UuidV7.isUuid(id ?? '') && !Number.isNaN(occurredAt.getTime())
      ? new AuditLogCursor(occurredAt, id)
      : null;
  }

  toString(): string {
    return Buffer.from(`${this.occurredAt.toISOString()}|${this.id}`).toString('base64url');
  }
}
