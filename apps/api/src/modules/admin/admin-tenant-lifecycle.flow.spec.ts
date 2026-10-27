import { TestData, TestDatabase, TestPlatform } from '@wattwisely/db/testing';
import { AdminFixture } from './admin.fixture';

/** Stories ADM-02 and ADM-04: plan limits in use, and a tenant suspended, deleted or reactivated by staff. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Admin console: tenant lifecycle', () => {
  const fixture = new AdminFixture();
  const { api } = fixture;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('enforces the plan’s user and connector limits', async () => {
    const tiny = await api.call(
      'POST',
      '/v1/admin/plans',
      fixture.asAdmin({ code: 'tiny', name: 'Tiny', user_limit: 2, connector_limit: 1 }),
    );
    const created = await api.call(
      'POST',
      '/v1/admin/tenants',
      fixture.asAdmin({ name: 'Tiny Co', plan_id: tiny.json().id }),
    );
    const tenantId = created.json().tenant.id;
    const owner = await api.data.person('owner@tiny.test');
    await api.data.member(tenantId, owner, TestData.ROLE_IDS.owner);
    const site = await api.data.site(tenantId, 'Yard');
    const charger = await api.data.charger(tenantId, site, 'CP-TINY');
    const token = await api.issuer.signFor(owner);
    const invite = (email: string) =>
      api.call('POST', '/v1/members/invites', {
        token,
        body: { email, roles: [{ role_id: TestData.ROLE_IDS.readOnly }] },
      });
    const addConnector = () =>
      api.call('POST', `/v1/chargers/${charger}/connectors`, { token, body: {} });

    const second = await invite('two@tiny.test');
    const third = await invite('three@tiny.test');
    const first = await addConnector();
    const over = await addConnector();

    expect(second.statusCode).toBe(201);
    expect(third.statusCode).toBe(403);
    expect(third.json()).toMatchObject({ code: 'plan_user_limit' });
    expect(first.statusCode).toBe(201);
    expect(over.statusCode).toBe(403);
    expect(over.json()).toMatchObject({ code: 'plan_connector_limit' });
  });

  it('suspends a tenant (read-only for its members), then deletes it 30 days later', async () => {
    const version = await fixture.versionOf(fixture.acme);
    const suspended = await api.call(
      'POST',
      `/v1/admin/tenants/${fixture.acme}/suspend`,
      fixture.asAdmin({ reason: 'Invoice unpaid' }, version),
    );
    const tooEarly = await api.call(
      'POST',
      `/v1/admin/tenants/${fixture.acme}/delete`,
      fixture.asAdmin({ confirm_slug: 'acme-charging', reason: 'Gone' }, version + 1),
    );
    const read = await api.call('GET', '/v1/members', fixture.asOwner());
    const write = await api.call('POST', '/v1/members/invites', {
      ...fixture.asOwner({
        email: 'x@acme.test',
        roles: [{ role_id: TestData.ROLE_IDS.readOnly }],
      }),
    });

    expect(suspended.statusCode).toBe(200);
    expect(suspended.json()).toMatchObject({ status: 'suspended' });
    expect(suspended.json().can_delete_from).not.toBeNull();
    expect(tooEarly.statusCode).toBe(409);
    expect(tooEarly.json()).toMatchObject({ code: 'tenant_deletion_too_early' });
    expect(read.statusCode).toBe(200);
    expect(write.statusCode).toBe(403);
    expect(write.json()).toMatchObject({ code: 'tenant_suspended' });

    await api.data.sql(
      "update tenants set suspended_at = now() - interval '31 days' where id = $1",
      [fixture.acme],
    );
    const wrongSlug = await api.call(
      'POST',
      `/v1/admin/tenants/${fixture.acme}/delete`,
      fixture.asAdmin({ confirm_slug: 'acme', reason: 'Gone' }, version + 1),
    );
    const asBilling = await api.call('POST', `/v1/admin/tenants/${fixture.acme}/delete`, {
      token: fixture.billingToken,
      body: { confirm_slug: 'acme-charging', reason: 'Gone' },
      version: version + 1,
    });
    const deleted = await api.call(
      'POST',
      `/v1/admin/tenants/${fixture.acme}/delete`,
      fixture.asAdmin({ confirm_slug: 'acme-charging', reason: 'Contract ended' }, version + 1),
    );
    const gone = await api.call('GET', '/v1/members', fixture.asOwner());

    expect(wrongSlug.statusCode).toBe(400);
    expect(asBilling.statusCode).toBe(403);
    expect(deleted.statusCode).toBe(200);
    expect(deleted.json()).toMatchObject({ status: 'cancelled' });
    expect(deleted.json().deleted_at).not.toBeNull();
    expect(gone.statusCode).toBe(403);
    expect(gone.json()).toMatchObject({ code: 'no_tenant' });
  });

  it('reactivates a suspended tenant and refuses the wrong transitions', async () => {
    const created = await api.call(
      'POST',
      '/v1/admin/tenants',
      fixture.asAdmin({ name: 'Pause Co', plan_id: TestPlatform.PLAN_IDS.flex }),
    );
    const id = created.json().tenant.id;
    const reactivateActive = await api.call(
      'POST',
      `/v1/admin/tenants/${id}/reactivate`,
      fixture.asAdmin({ reason: 'Oops' }, 1),
    );
    await api.call(
      'POST',
      `/v1/admin/tenants/${id}/suspend`,
      fixture.asAdmin({ reason: 'Hold' }, 1),
    );
    const stale = await api.call(
      'POST',
      `/v1/admin/tenants/${id}/reactivate`,
      fixture.asAdmin({ reason: 'Paid' }, 1),
    );
    const reactivated = await api.call(
      'POST',
      `/v1/admin/tenants/${id}/reactivate`,
      fixture.asAdmin({ reason: 'Paid' }, 2),
    );
    const renamed = await api.call(
      'PATCH',
      `/v1/admin/tenants/${id}`,
      fixture.asAdmin({ name: 'Pause & Go', region: 'FR' }, 3),
    );

    expect(reactivateActive.statusCode).toBe(409);
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: 'version_conflict' });
    expect(reactivated.json()).toMatchObject({ status: 'active', suspended_at: null, version: 3 });
    expect(renamed.json()).toMatchObject({ name: 'Pause & Go', region: 'FR', slug: 'pause-co' });
  });
});
