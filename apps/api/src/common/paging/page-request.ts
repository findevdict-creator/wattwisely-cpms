import { HttpStatus } from '@nestjs/common';
import { ProblemException } from '../problem/problem.exception';
import { ListCursor } from './list-cursor';

/** limit and cursor from a list query, checked once so every list pages the same way. */
export class PageRequest {
  static readonly DEFAULT_LIMIT = 25;

  private constructor(
    readonly limit: number,
    readonly cursor: ListCursor | null,
  ) {}

  /** 400 when the cursor is not one this API handed out. */
  static from(query: { limit?: number; cursor?: string }): PageRequest {
    const cursor = query.cursor ? ListCursor.parse(query.cursor) : null;
    if (query.cursor && !cursor) {
      throw new ProblemException(
        HttpStatus.BAD_REQUEST,
        'validation_failed',
        'cursor is not valid',
      );
    }
    return new PageRequest(query.limit ?? PageRequest.DEFAULT_LIMIT, cursor);
  }

  /** Repositories read one row more than the limit to learn whether another page follows. */
  get fetchSize(): number {
    return this.limit + 1;
  }

  /** The rows of this page and the cursor of the next one (null on the last page). */
  cut<T extends { id: string }>(rows: T[], keyOf: (row: T) => string) {
    const items = rows.slice(0, this.limit);
    const last = items[items.length - 1];
    const next = rows.length > this.limit ? new ListCursor(keyOf(last), last.id) : null;
    return { items, nextCursor: next?.toString() ?? null };
  }
}
