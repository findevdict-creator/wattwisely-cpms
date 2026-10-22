import { UuidV7 } from '@wattwisely/db';

/**
 * The opaque next_cursor of a list sorted by a text key, e.g. a site name or a charger
 * identity: the key and id of the last row on the page. The next page starts right
 * after it, which stays fast however long the list grows (API Design, "cursor").
 */
export class ListCursor {
  constructor(
    readonly key: string,
    readonly id: string,
  ) {}

  /** The cursor, or null when the value was not made by toString(). */
  static parse(value: string): ListCursor | null {
    const text = Buffer.from(value, 'base64url').toString('utf8');
    const separator = text.lastIndexOf('|');
    const id = text.slice(separator + 1);
    return separator > 0 && UuidV7.isUuid(id) ? new ListCursor(text.slice(0, separator), id) : null;
  }

  toString(): string {
    return Buffer.from(`${this.key}|${this.id}`).toString('base64url');
  }
}
