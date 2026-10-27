import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../schema';

/** The typed database handle every repository works with. */
export type Database = NodePgDatabase<typeof schema>;

/**
 * Owns the connection pool to Postgres. The API and the OCPP gateway connect as
 * wattwisely_app, a role that does not own the tables, so row-level security applies
 * to every query. Repositories never use this directly: they get a transaction from
 * TransactionRunner. Each app wires one instance into its dependency injection.
 */
export class DatabaseClient {
  static readonly POOL_SIZE = 10;

  readonly pool: Pool;
  readonly db: Database;

  constructor(connectionString: string, poolSize: number = DatabaseClient.POOL_SIZE) {
    this.pool = new Pool({ connectionString, max: poolSize });
    // An idle connection that Postgres closes (a restart, a dropped test database) is an
    // 'error' on the pool. The pool has already discarded it and the next query opens a new
    // one, so it is not fatal; without a listener Node would crash the process instead.
    this.pool.on('error', () => undefined);
    this.db = drizzle(this.pool, { schema });
  }

  async isReachable(): Promise<boolean> {
    try {
      await this.pool.query('select 1');
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
