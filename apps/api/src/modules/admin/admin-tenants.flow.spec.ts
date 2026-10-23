import { TestDatabase, TestPlatform } from '@wattwisely/db/testing';
import { AdminFixture } from './admin.fixture';

/** Stories ADM-01 and ADM-02: staff list and create tenants, and set their plans and modules. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Admin console: tenants', () => {
  const fixture = new AdminFixture();
  const { api } = fixture;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('lists every tenant with its plan and size for staff, and for nobody else', async () => {
    const list = await api.call('GET', '/v1/admin/tenants?q=acme', fixture.asAdmin());
    const asViewer = await api.call('GET', '/v1/admin/tenants', { token: fixture.viewerToken });
    const asOwner = await api.call('GET', '/v1/admin/tenants', fixture.asOwner());

    expect(list.statusCode).toBe(200);
    expect(list.json()).toMatchObject({
      items: [
        {
          slug: 'acme-charging',
          status: 'active',
          plan: { code: 'starter' },
          subscription_status: 'active',
          usage: { users: 1, connectors: 0 },
        },
      ],
      next_cursor: null,
    });
    expect(asViewer.statusCode).toBe(200);
    expect(asOwner.statusCode).toBe(403);
    expect(asOwner.json()).toMatchObject({ code: 'not_platform_staff' });
  });

  it('creates a tenant on a plan and invites its first Owner, who can accept and log in', async () => {
    const created = await api.call(
      'POST',
      '/v1/admin/tenants',
      fixture.asAdmin({
        name: 'Volt Hotels',
        region: 'GB',
        plan_id: TestPlatform.PLAN_IDS.growth,
        owner_email: 'vera@volt.test',
        billing_email: 'accounts@volt.test',
      }),
    );
    const asViewer = await api.call('POST', '/v1/admin/tenants', {
      token: fixture.viewerToken,
      body: { name: 'Nope', plan_id: TestPlatform.PLAN_IDS.growth },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      is_owner_email_sent: true,
      tenant: {
        slug: 'volt-hotels',
        status: 'active',
        plan: { code: 'growth' },
        subscription: { plan: { code: 'growth' }, billing_email: 'accounts@volt.test', notes: '' },
        owners: [{ email: 'vera@volt.test', status: 'invited' }],
      },
    });
    const modules = created.json().tenant.subscription.modules;
    expect(modules).toContainEqual(
      expect.objectContaining({ key: 'custom_roles', is_enabled: true, source: 'plan' }),
    );
    expect(modules).toContainEqual(
      expect.objectContaining({ key: 'load_management', is_enabled: false, source: null }),
    );
    expect(asViewer.statusCode).toBe(403);
    expect(asViewer.json()).toMatchObject({ code: 'permission_denied' });

    const link = api.mail.lastInvitationToken('vera@volt.test');
    const vera = await api.issuer.sign({ sub: 'kc-vera', email: 'vera@volt.test' });
    const accepted = await api.call('POST', `/v1/invitations/${link}/accept`, { token: vera });
    const me = await api.call('GET', '/v1/me/permissions', { token: vera });
    expect(accepted.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ plan: { code: 'growth' }, roles: [{ key: 'owner' }] });
    expect(me.json().locked_modules).toEqual(['load_management', 'messaging_charging']);
  });

  it('refuses a short name that is taken, an inactive plan and an unknown module', async () => {
    const plan = await api.call(
      'POST',
      '/v1/admin/plans',
      fixture.asAdmin({ code: 'legacy', name: 'Legacy', is_active: false }),
    );
    const taken = await api.call(
      'POST',
      '/v1/admin/tenants',
      fixture.asAdmin({ name: 'Acme Charging', plan_id: TestPlatform.PLAN_IDS.flex }),
    );
    const inactive = await api.call(
      'POST',
      '/v1/admin/tenants',
      fixture.asAdmin({ name: 'Old Timer', plan_id: plan.json().id }),
    );
    const badModule = await api.call(
      'PUT',
      `/v1/admin/tenants/${fixture.acme}/modules/sites`,
      fixture.asAdmin({ source: 'addon' }),
    );

    expect(plan.statusCode).toBe(201);
    expect(taken.statusCode).toBe(409);
    expect(taken.json()).toMatchObject({ code: 'tenant_slug_taken' });
    expect(inactive.statusCode).toBe(409);
    expect(inactive.json()).toMatchObject({ code: 'plan_inactive' });
    expect(badModule.statusCode).toBe(400);
  });

  it('changes a tenant’s plan and modules; the tenant sees it on its Plan page and in its audit log', async () => {
    const plan = await api.call(
      'PUT',
      `/v1/admin/tenants/${fixture.acme}/subscription`,
      fixture.asAdmin({ plan_id: TestPlatform.PLAN_IDS.growth, notes: 'Upgraded after the pilot' }),
    );
    const addon = await api.call(
      'PUT',
      `/v1/admin/tenants/${fixture.acme}/modules/load_management`,
      fixture.asAdmin({ source: 'addon' }),
    );
    const taken = await api.call(
      'PUT',
      `/v1/admin/tenants/${fixture.acme}/modules/api_keys`,
      fixture.asAdmin({ source: 'override', is_enabled: false, note: 'Not for this one' }),
    );
    const mine = await api.call('GET', '/v1/subscription', fixture.asOwner());
    const log = await api.call('GET', '/v1/audit-log?actor_type=platform', fixture.asOwner());

    expect(plan.statusCode).toBe(200);
    expect(plan.json()).toMatchObject({
      plan: { code: 'growth' },
      notes: 'Upgraded after the pilot',
    });
    expect(addon.statusCode).toBe(200);
    expect(taken.statusCode).toBe(200);
    expect(mine.statusCode).toBe(200);
    expect(mine.json()).toMatchObject({
      plan: { code: 'growth', connector_limit: 500 },
      status: 'active',
      usage: { users: 1, user_limit: null, connectors: 0, connector_limit: 500 },
    });
    expect(mine.json().notes).toBeUndefined();
    const byKey = Object.fromEntries(mine.json().modules.map((m: { key: string }) => [m.key, m]));
    expect(byKey['load_management']).toMatchObject({
      is_enabled: true,
      source: 'addon',
      price: { amount: 300, currency: 'USD', pricing_unit: 'per_connector' },
    });
    expect(byKey['api_keys']).toMatchObject({ is_enabled: false, source: null });
    expect(byKey['custom_roles']).toMatchObject({ is_enabled: true, source: 'plan' });
    expect(log.json().items.map((e: { action: string }) => e.action)).toEqual([
      'admin.module_changed',
      'admin.module_changed',
      'admin.plan_changed',
    ]);

    const reset = await api.call(
      'DELETE',
      `/v1/admin/tenants/${fixture.acme}/modules/api_keys`,
      fixture.asAdmin(),
    );
    expect(reset.json().modules).toContainEqual(
      expect.objectContaining({ key: 'api_keys', is_enabled: true, source: 'plan' }),
    );
  });
});
