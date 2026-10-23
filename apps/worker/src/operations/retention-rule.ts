import { SQL } from 'drizzle-orm';
import { AnyPgColumn, PgTable } from 'drizzle-orm/pg-core';

/** One kind of data the retention job deletes: the table, its id, and what counts as old. */
export interface RetentionRule {
  /** For the log and the metrics, e.g. ocpp_messages. */
  name: string;
  table: PgTable;
  id: AnyPgColumn;
  /** Rows older than this are deleted. */
  isOld: (cutoff: Date) => SQL | undefined;
  days: number;
}
