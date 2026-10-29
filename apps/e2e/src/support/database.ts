import { Client } from 'pg';
import { StackUrls } from './stack-urls';

/**
 * Read-only checks against the stack's database, as the superuser: what a journey left behind
 * (a session's price, a command's state) where the screens show only part of it.
 */
export class Database {
  static async rows<T = Record<string, unknown>>(
    sql: string,
    values: unknown[] = [],
  ): Promise<T[]> {
    const client = new Client({ connectionString: StackUrls.DATABASE });
    await client.connect();
    try {
      return (await client.query(sql, values)).rows as T[];
    } finally {
      await client.end();
    }
  }

  static async one<T = Record<string, unknown>>(
    sql: string,
    values: unknown[] = [],
  ): Promise<T | undefined> {
    return (await Database.rows<T>(sql, values))[0];
  }
}
