import { TestData, TestDatabase, TestPlatform } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Module 17: a site's power cap and how it is shared, behind the load_management add-on. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Load management', () => {
  const api = new TestApi();
  let acme: string;
  let site: string;
  let other: string;
  let chargerA: string;
  let chargerB: string;
  let owner: string;
  let technician: string;
  let entitlement: string;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    await api.platform.subscription(acme, TestPlatform.PLAN_IDS.growth);
    entitlement = await api.platform.entitlement(acme, 'load_management');
    site = await api.data.site(acme, 'Riverside');
    other = await api.data.site(acme, 'Hilltop');
    chargerA = await api.data.charger(acme, site, 'WW-A');
    chargerB = await api.data.charger(acme, site, 'WW-B');
    await api.data.connector(acme, chargerA, 1, 22);
    await api.data.connector(acme, chargerA, 2, 22);
    await api.data.connector(acme, chargerB, 1, 7.4);
    const olivia = await api.data.person('olivia@acme.test', 'Olivia');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    owner = await api.issuer.signFor(olivia);
    const tom = await api.data.person('tom@acme.test', 'Tom');
    await api.data.member(acme, tom, TestData.ROLE_IDS.technician, site);
    technician = await api.issuer.signFor(tom);
  });

  afterAll(async () => api.stop());

  it('shows the defaults and every charger before a policy is saved', async () => {
    const answer = await api.call('GET', `/v1/sites/${site}/load-management`, { token: owner });

    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toMatchObject({
      policy: {
        is_enabled: false,
        limit_kw: 100,
        strategy: 'equal_share',
        min_power_kw: 4.2,
        version: 0,
      },
      allocated_kw: 0,
      charging_count: 0,
    });
    expect(answer.json().chargers).toEqual([
      expect.objectContaining({
        id: chargerA,
        identity: 'WW-A',
        status: 'waiting',
        priority: 5,
        max_power_kw: null,
        connectors_max_kw: 44,
        allocated_kw: null,
      }),
      expect.objectContaining({ id: chargerB, connectors_max_kw: 7.4 }),
    ]);
  });

  it('saves the policy and the chargers’ priorities with If-Match 0, and logs it', async () => {
    const body = {
      is_enabled: true,
      limit_kw: 30,
      strategy: 'priority',
      min_power_kw: 4.2,
      chargers: [
        { charger_id: chargerA, priority: 8, max_power_kw: 40 },
        { charger_id: chargerB, priority: 3 },
      ],
    };
    const missing = await api.call('PUT', `/v1/sites/${site}/load-management`, {
      token: owner,
      body,
    });
    const saved = await api.call('PUT', `/v1/sites/${site}/load-management`, {
      token: owner,
      version: 0,
      body,
    });
    const stale = await api.call('PUT', `/v1/sites/${site}/load-management`, {
      token: owner,
      version: 0,
      body,
    });

    expect(missing.statusCode).toBe(428);
    expect(saved.statusCode).toBe(200);
    expect(saved.json().policy).toMatchObject({
      is_enabled: true,
      limit_kw: 30,
      strategy: 'priority',
      version: 1,
    });
    expect(saved.json().chargers[0]).toMatchObject({ priority: 8, max_power_kw: 40 });
    expect(saved.json().chargers[1]).toMatchObject({ priority: 3, max_power_kw: null });
    expect(stale.statusCode).toBe(409);
    const audit = await api.call('GET', `/v1/audit-log?target_type=site`, { token: owner });
    expect(audit.json().items[0]).toMatchObject({
      action: 'load_management.updated',
      target_id: site,
      target_label: 'Riverside',
    });
  });

  it('refuses a charger from another site and a minimum above the limit', async () => {
    const stranger = await api.data.charger(acme, other, 'WW-X');
    const wrongSite = await api.call('PUT', `/v1/sites/${site}/load-management`, {
      token: owner,
      version: 1,
      body: {
        is_enabled: true,
        limit_kw: 30,
        strategy: 'equal_share',
        min_power_kw: 4.2,
        chargers: [{ charger_id: stranger, priority: 5 }],
      },
    });
    const tooHigh = await api.call('PUT', `/v1/sites/${site}/load-management`, {
      token: owner,
      version: 1,
      body: {
        is_enabled: true,
        limit_kw: 3,
        strategy: 'equal_share',
        min_power_kw: 4.2,
        chargers: [],
      },
    });
    const gone = await api.call('GET', `/v1/sites/${chargerA}/load-management`, { token: owner });

    expect(wrongSite.statusCode).toBe(422);
    expect(wrongSite.json().code).toBe('charger_not_at_site');
    expect(tooHigh.statusCode).toBe(422);
    expect(tooHigh.json().code).toBe('load_minimum_above_limit');
    expect(gone.statusCode).toBe(404);
    expect(gone.json().code).toBe('site_not_found');
  });

  it('shows the caps the worker handed out', async () => {
    await api.data.sql(
      `insert into charger_load_allocations (id, tenant_id, site_id, charger_id, limit_w, reason, is_charging, is_applied, applied_at)
       values (gen_random_uuid(), $1, $2, $3, 25800, 'share', true, true, now()),
              (gen_random_uuid(), $1, $2, $4, 4200, 'idle', false, false, null)`,
      [acme, site, chargerA, chargerB],
    );
    const answer = await api.call('GET', `/v1/sites/${site}/load-management`, {
      token: technician,
    });

    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toMatchObject({ allocated_kw: 30, charging_count: 1 });
    expect(answer.json().chargers[0]).toMatchObject({
      allocated_kw: 25.8,
      reason: 'share',
      is_charging: true,
      is_applied: true,
    });
    expect(answer.json().chargers[0].applied_at).not.toBeNull();
    expect(answer.json().chargers[1]).toMatchObject({
      allocated_kw: 4.2,
      reason: 'idle',
      is_applied: false,
    });
  });

  it('lets a technician read but not write, and only at their site', async () => {
    const write = await api.call('PUT', `/v1/sites/${site}/load-management`, {
      token: technician,
      version: 1,
      body: {
        is_enabled: false,
        limit_kw: 30,
        strategy: 'equal_share',
        min_power_kw: 4.2,
        chargers: [],
      },
    });
    const elsewhere = await api.call('GET', `/v1/sites/${other}/load-management`, {
      token: technician,
    });

    expect(write.statusCode).toBe(403);
    expect(elsewhere.statusCode).toBe(403);
    expect(elsewhere.json().code).toBe('permission_denied');
  });

  it('is locked without the add-on', async () => {
    await api.data.sql('delete from tenant_entitlements where id = $1', [entitlement]);
    // Access is cached for half a minute per person; a new member sees the plan as it is now.
    const sam = await api.data.person('sam@acme.test', 'Sam');
    await api.data.member(acme, sam, TestData.ROLE_IDS.owner);
    const answer = await api.call('GET', `/v1/sites/${site}/load-management`, {
      token: await api.issuer.signFor(sam),
    });

    expect(answer.statusCode).toBe(403);
    expect(answer.json().code).toBe('module_not_in_plan');
  });
});
