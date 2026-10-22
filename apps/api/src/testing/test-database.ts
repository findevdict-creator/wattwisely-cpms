import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { Client } from 'pg';
import { DatabaseMigrator } from '@wattwisely/db';

/**
 * A throw-away database for one test file, migrated like production.
 *
 * Set TEST_DATABASE_URL to a superuser connection on a disposable Postgres 16
 * (CI starts one; locally e.g. postgres://postgres:postgres@localhost:5432/postgres).
 * It creates the wattwisely_migrator and wattwisely_app roles if needed, with
 * test passwords, then a database owned by the migrator role.
 */
export class TestDatabase {
  static readonly ROLE_PASSWORD = 'wattwisely-test';
  static readonly MIGRATIONS = join(__dirname, '../../../../packages/db/migrations');

  private constructor(
    private readonly adminUrl: URL,
    readonly name: string,
  ) {}

  /** True when database tests can run. In CI a missing URL is an error, never a silent skip. */
  static isConfigured(): boolean {
    if (!process.env['TEST_DATABASE_URL'] && process.env['CI']) {
      throw new Error('TEST_DATABASE_URL must be set in CI');
    }
    return Boolean(process.env['TEST_DATABASE_URL']);
  }

  static async create(): Promise<TestDatabase> {
    const adminUrl = new URL(process.env['TEST_DATABASE_URL'] as string);
    const database = new TestDatabase(adminUrl, `ww_test_${randomBytes(6).toString('hex')}`);
    await database.admin(async (client) => {
      await TestDatabase.ensureRole(client, 'wattwisely_migrator');
      await TestDatabase.ensureRole(client, 'wattwisely_app');
      await client.query(`create database ${database.name} owner wattwisely_migrator`);
    });
    await new DatabaseMigrator(
      database.urlFor('wattwisely_migrator'),
      TestDatabase.MIGRATIONS,
    ).migrate();
    return database;
  }

  /** Connection string for one of the two roles, in this test database. */
  urlFor(role: 'wattwisely_app' | 'wattwisely_migrator'): string {
    const url = new URL(this.adminUrl);
    url.username = role;
    url.password = TestDatabase.ROLE_PASSWORD;
    url.pathname = `/${this.name}`;
    return url.toString();
  }

  /** Runs SQL as the table owner, which bypasses RLS: for setting up test data only. */
  async asOwner<T>(work: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: this.urlFor('wattwisely_migrator') });
    await client.connect();
    try {
      return await work(client);
    } finally {
      await client.end();
    }
  }

  async drop(): Promise<void> {
    await this.admin((client) => client.query(`drop database if exists ${this.name} with (force)`));
  }

  private async admin<T>(work: (client: Client) => Promise<T>): Promise<T> {
    const client = new Client({ connectionString: this.adminUrl.toString() });
    await client.connect();
    try {
      return await work(client);
    } finally {
      await client.end();
    }
  }

  private static async ensureRole(client: Client, role: string): Promise<void> {
    const { rowCount } = await client.query('select 1 from pg_roles where rolname = $1', [role]);
    const verb = rowCount ? 'alter' : 'create';
    await client.query(`${verb} role ${role} login password '${TestDatabase.ROLE_PASSWORD}'`);
  }
}
