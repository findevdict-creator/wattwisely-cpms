import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { DatabaseMigrator } from '@wattwisely/db';

/**
 * `node migrate.js` inside the API image: brings the database schema up to date.
 * deploy/scripts/up.sh runs it before starting the API. It connects as the owner
 * of the tables (MIGRATION_DATABASE_URL), never as the API's own role.
 */
export class MigrationCommand {
  private readonly logger = new Logger(MigrationCommand.name);

  async run(): Promise<void> {
    const connectionString = process.env['MIGRATION_DATABASE_URL'];
    if (!connectionString) {
      this.logger.error('Set MIGRATION_DATABASE_URL to run migrations.');
      process.exit(1);
    }
    try {
      await new DatabaseMigrator(connectionString, join(__dirname, 'migrations')).migrate();
      this.logger.log('Database is up to date');
    } catch (error) {
      this.logger.error(`Migration failed: ${(error as Error).message}`);
      process.exit(1);
    }
  }
}
