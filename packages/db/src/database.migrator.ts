import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

/**
 * Applies the SQL files in migrations/ that the database has not seen yet, in order,
 * each once. Drizzle records what ran in the drizzle.__drizzle_migrations table.
 * Runs as wattwisely_migrator, the role that owns the tables.
 */
export class DatabaseMigrator {
  constructor(
    private readonly connectionString: string,
    private readonly migrationsFolder: string,
  ) {}

  async migrate(): Promise<void> {
    const pool = new Pool({ connectionString: this.connectionString, max: 1 });
    try {
      await migrate(drizzle(pool), { migrationsFolder: this.migrationsFolder });
    } finally {
      await pool.end();
    }
  }
}
