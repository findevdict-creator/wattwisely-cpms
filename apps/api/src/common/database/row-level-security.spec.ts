import { Client } from 'pg';
import { PermissionCatalog } from '../permissions/permission-catalog';
import { TestData } from '../../testing/test-data';
import { TestDatabase } from '../../testing/test-database';

/**
 * The database's own guarantees, checked as the API's database role: Postgres
 * row-level security keeps tenants apart even if a query forgets its WHERE clause.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Row-level security', () => {
  let database: TestDatabase;
  let data: TestData;
  let app: Client;
  let acme: string;
  let volt: string;

  beforeAll(async () => {
    database = await TestDatabase.create();
    data = new TestData(database);
    acme = await data.tenant('acme-charging');
    volt = await data.tenant('volt-hotels');
    await data.member(acme, await data.person('a@acme.test'), TestData.ROLE_IDS.owner);
    await data.member(volt, await data.person('v@volt.test'), TestData.ROLE_IDS.owner);
    app = new Client({ connectionString: database.urlFor('wattwisely_app') });
    await app.connect();
  });

  afterAll(async () => {
    await app?.end();
    await database?.drop();
  });

  /** Runs one query as the API would, inside a transaction with app.tenant_id set. */
  const inTenant = async (tenantId: string, text: string, values: unknown[] = []) => {
    await app.query('begin');
    try {
      await app.query("select set_config('app.tenant_id', $1, true)", [tenantId]);
      return await app.query(text, values);
    } finally {
      await app.query('rollback');
    }
  };

  it('is switched on, with a policy, for every table that has a tenant_id', async () => {
    const { rows } = await app.query(`
      select c.relname, c.relrowsecurity, count(p.polname)::int as policies
      from pg_class c
      join pg_attribute a on a.attrelid = c.oid and a.attname = 'tenant_id'
      left join pg_policy p on p.polrelid = c.oid
      where c.relnamespace = 'public'::regnamespace and c.relkind = 'r'
      group by c.relname, c.relrowsecurity`);

    expect(rows.length).toBeGreaterThanOrEqual(5);
    for (const row of rows) {
      expect({ table: row.relname, rls: row.relrowsecurity }).toEqual({
        table: row.relname,
        rls: true,
      });
      expect(row.policies).toBeGreaterThan(0);
    }
  });

  it('shows a tenant only its own memberships, and nothing without a tenant', async () => {
    const acmeRows = await inTenant(acme, 'select tenant_id from tenant_memberships');
    const noTenant = await app.query('select tenant_id from tenant_memberships');

    expect(acmeRows.rows).toEqual([{ tenant_id: acme }]);
    expect(noTenant.rows).toEqual([]);
  });

  it('refuses to write audit entries into another tenant', async () => {
    const write = inTenant(
      acme,
      `insert into audit_log (id, tenant_id, actor_type, actor_label, action, target_type)
       values (gen_random_uuid(), $1, 'system', 'test', 'test', 'test')`,
      [volt],
    );

    await expect(write).rejects.toThrow(/row-level security/);
  });

  it('keeps sites and chargers apart, but lets the gateway find a charger by its identity', async () => {
    const site = await data.site(acme, 'Riverside');
    await data.charger(acme, site, 'WW-TESTCHARGER');

    const own = await inTenant(acme, 'select name from sites');
    const other = await inTenant(volt, 'select name from sites');
    expect(own.rows).toEqual([{ name: 'Riverside' }]);
    expect(other.rows).toEqual([]);
    expect((await app.query('select id from chargers')).rows).toEqual([]);

    await app.query('begin');
    try {
      await app.query("select set_config('app.charger_identity', 'ww-testcharger', true)");
      const found = await app.query('select tenant_id, ocpp_identity from chargers');
      expect(found.rows).toEqual([{ tenant_id: acme, ocpp_identity: 'WW-TESTCHARGER' }]);
      const sitesStillHidden = await app.query('select id from sites');
      expect(sitesStillHidden.rows).toEqual([]);
    } finally {
      await app.query('rollback');
    }
  });

  it('keeps the audit log append-only and tenants read-only for the API', async () => {
    await expect(inTenant(acme, 'delete from audit_log')).rejects.toThrow(/permission denied/);
    await expect(inTenant(acme, "update tenants set name = 'x'")).rejects.toThrow(
      /permission denied/,
    );
  });

  it('only grants permissions the API knows, and gives the Owner role all of them', async () => {
    const { rows } = await app.query(
      'select r.key, rp.permission_key from role_permissions rp join roles r on r.id = rp.role_id',
    );
    const ownerKeys = rows.filter((row) => row.key === 'owner').map((row) => row.permission_key);

    expect(rows.filter((row) => !PermissionCatalog.isKnown(row.permission_key))).toEqual([]);
    expect(ownerKeys.sort()).toEqual(PermissionCatalog.ENTRIES.map((entry) => entry.key).sort());
  });
});
