import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@wattwisely/db';
import { ApiConfig } from '../../config/api.config';

/** The typed database handle every repository works with. */
export type Database = NodePgDatabase<typeof schema>;

/**
 * Owns the connection pool to Postgres. The API connects as wattwisely_app, a role
 * that does not own the tables, so row-level security applies to every query.
 * Repositories never use this directly: they get a transaction from TransactionRunner.
 */
@Injectable()
export class DatabaseClient implements OnModuleDestroy {
  static readonly POOL_SIZE = 10;

  readonly pool: Pool;
  readonly db: Database;

  constructor(config: ApiConfig) {
    this.pool = new Pool({ connectionString: config.databaseUrl, max: DatabaseClient.POOL_SIZE });
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

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
