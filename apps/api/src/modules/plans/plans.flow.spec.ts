import { TestDatabase } from '@wattwisely/db/testing';
import { AdminFixture } from '../admin/admin.fixture';

/** Story ADM-03: the plan catalogue and add-on prices, edited by Wattwisely staff. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Admin console: plans', () => {
  const fixture = new AdminFixture();
  const { api } = fixture;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('lists the launch plans with their tenants, the add-ons with prices and every module', async () => {
    const plans = await api.call('GET', '/v1/admin/plans', { token: fixture.viewerToken });
    const addons = await api.call('GET', '/v1/admin/addons', { token: fixture.viewerToken });
    const modules = await api.call('GET', '/v1/admin/modules', { token: fixture.viewerToken });
    const asOwner = await api.call('GET', '/v1/admin/plans', fixture.asOwner());

    expect(plans.statusCode).toBe(200);
    expect(plans.json().map((plan: { code: string }) => plan.code)).toEqual([
      'flex',
      'starter',
      'growth',
      'enterprise',
    ]);
    expect(plans.json()[1]).toMatchObject({
      code: 'starter',
      platform_fee: 4900,
      ac_connector_fee: 1200,
      dc_connector_fee: 1800,
      connector_limit: 25,
      user_limit: 5,
      module_keys: [],
      tenant_count: 1,
    });
    expect(addons.json()).toEqual([
      expect.objectContaining({
        key: 'load_management',
        name: 'Load management',
        price: 300,
        pricing_unit: 'per_connector',
      }),
      expect.objectContaining({
        key: 'messaging_charging',
        price: 4900,
        pricing_unit: 'per_tenant',
      }),
    ]);
    expect(
      modules.json().map((module: { key: string; kind: string }) => `${module.key}:${module.kind}`),
    ).toContain('load_management:addon');
    expect(asOwner.statusCode).toBe(403);
  });

  it('creates and changes a plan with the version seen, and refuses a taken code or an unknown module', async () => {
    const created = await api.call(
      'POST',
      '/v1/admin/plans',
      fixture.asAdmin({
        code: 'growth-eu',
        name: 'Growth (EU)',
        currency: 'EUR',
        platform_fee: 27900,
        module_keys: ['api_keys', 'advanced_reports'],
      }),
    );
    const duplicate = await api.call(
      'POST',
      '/v1/admin/plans',
      fixture.asAdmin({ code: 'growth-eu', name: 'Again' }),
    );
    const unknown = await api.call(
      'POST',
      '/v1/admin/plans',
      fixture.asAdmin({ code: 'odd', name: 'Odd', module_keys: ['sites'] }),
    );
    const asBilling = await api.call('PATCH', `/v1/admin/plans/${created.json().id}`, {
      token: fixture.billingToken,
      body: { user_limit: 10, is_active: false },
      version: 1,
    });
    const stale = await api.call(
      'PATCH',
      `/v1/admin/plans/${created.json().id}`,
      fixture.asAdmin({ name: 'Late' }, 1),
    );
    const asViewer = await api.call('PATCH', `/v1/admin/plans/${created.json().id}`, {
      token: fixture.viewerToken,
      body: { name: 'Nope' },
      version: 2,
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      code: 'growth-eu',
      currency: 'EUR',
      module_keys: ['advanced_reports', 'api_keys'],
      is_active: true,
      tenant_count: 0,
      version: 1,
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ code: 'plan_code_taken' });
    expect(unknown.statusCode).toBe(400);
    expect(asBilling.statusCode).toBe(200);
    expect(asBilling.json()).toMatchObject({ user_limit: 10, is_active: false, version: 2 });
    expect(stale.statusCode).toBe(409);
    expect(asViewer.statusCode).toBe(403);
  });

  it('changes an add-on’s price and records every catalogue change as a platform action', async () => {
    const priced = await api.call(
      'PATCH',
      '/v1/admin/addons/load_management',
      fixture.asAdmin({ price: 350, currency: 'USD' }, 1),
    );
    const missing = await api.call(
      'PATCH',
      '/v1/admin/addons/teleport',
      fixture.asAdmin({ price: 1 }, 1),
    );
    const log = await api.call('GET', '/v1/admin/audit-log?target_type=addon', fixture.asAdmin());

    expect(priced.statusCode).toBe(200);
    expect(priced.json()).toMatchObject({ key: 'load_management', price: 350, version: 2 });
    expect(missing.statusCode).toBe(404);
    expect(log.json().items).toEqual([
      expect.objectContaining({
        action: 'plans.addon_changed',
        actor_type: 'platform',
        tenant_id: null,
        before: expect.objectContaining({ price: 300 }),
        after: expect.objectContaining({ price: 350 }),
      }),
    ]);
  });
});
