import { DrizzleQueryError } from 'drizzle-orm';

/**
 * Reads Postgres errors that services turn into friendly answers.
 * A unique index is the only safe guard against two requests saving the same name at
 * the same moment, so services catch the violation after the transaction has rolled back.
 */
export class DatabaseErrors {
  static readonly UNIQUE_VIOLATION = '23505';

  /** The name of the unique constraint or index the error broke, or null for any other error. */
  static violatedUniqueConstraint(error: unknown): string | null {
    const cause = error instanceof DrizzleQueryError ? error.cause : error;
    if (typeof cause !== 'object' || cause === null) {
      return null;
    }
    const details = cause as { code?: string; constraint?: string };
    return details.code === DatabaseErrors.UNIQUE_VIOLATION ? (details.constraint ?? null) : null;
  }
}
