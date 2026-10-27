import { TestDatabase } from '@wattwisely/db/testing';
import { AdminFixture } from './admin.fixture';

/** Wattwisely's own staff: roles in the console, who may change them, and the platform-wide audit log. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Admin console: staff', () => {
  const fixture = new AdminFixture();
  const { api } = fixture;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('tells the console my role, and tenant users that they have none', async () => {
    const staff = await api.call('GET', '/v1/me', { token: fixture.billingToken });
    const owner = await api.call('GET', '/v1/me', fixture.asOwner());
    const roles = await api.call('GET', '/v1/admin/staff/roles', { token: fixture.viewerToken });

    expect(staff.json()).toMatchObject({
      is_platform_staff: true,
      platform: { role: 'billing', permissions: expect.arrayContaining(['plans:write']) },
    });
    expect(staff.json().platform.permissions).not.toContain('staff:manage');
    expect(owner.json()).toMatchObject({ is_platform_staff: false, platform: null });
    expect(roles.json().map((role: { key: string }) => role.key)).toEqual([
      'admin',
      'billing',
      'support',
      'viewer',
    ]);
  });

  it('adds a colleague by e-mail before they ever logged in, and lets them in at once', async () => {
    const added = await api.call(
      'POST',
      '/v1/admin/staff',
      fixture.asAdmin({ email: 'sam@wattwisely.test', role: 'support' }),
    );
    const again = await api.call(
      'POST',
      '/v1/admin/staff',
      fixture.asAdmin({ email: 'sam@wattwisely.test', role: 'viewer' }),
    );
    const asBilling = await api.call('POST', '/v1/admin/staff', {
      token: fixture.billingToken,
      body: { email: 'x@wattwisely.test', role: 'viewer' },
    });
    const sam = await api.issuer.sign({ sub: 'kc-sam', email: 'sam@wattwisely.test' });
    const tenants = await api.call('GET', '/v1/admin/tenants', { token: sam });
    const list = await api.call('GET', '/v1/admin/staff', { token: sam });

    expect(added.statusCode).toBe(201);
    expect(added.json()).toMatchObject({
      email: 'sam@wattwisely.test',
      role: 'support',
      version: 1,
    });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ code: 'already_staff' });
    expect(asBilling.statusCode).toBe(403);
    expect(tenants.statusCode).toBe(200);
    expect(list.json().map((member: { email: string }) => member.email)).toEqual([
      'ana@wattwisely.test',
      'bea@wattwisely.test',
      'sam@wattwisely.test',
      'vic@wattwisely.test',
    ]);
  });

  it('changes roles with the version seen, keeps one admin, and ends access on removal', async () => {
    const list = await api.call('GET', '/v1/admin/staff', fixture.asAdmin());
    const byEmail = Object.fromEntries(list.json().map((m: { email: string }) => [m.email, m]));
    const ana = byEmail['ana@wattwisely.test'];
    const vic = byEmail['vic@wattwisely.test'];

    const demoteLast = await api.call(
      'PATCH',
      `/v1/admin/staff/${ana.id}`,
      fixture.asAdmin({ role: 'viewer' }, ana.version),
    );
    const removeLast = await api.call(
      'DELETE',
      `/v1/admin/staff/${ana.id}`,
      fixture.asAdmin(undefined, ana.version),
    );
    const promoted = await api.call(
      'PATCH',
      `/v1/admin/staff/${vic.id}`,
      fixture.asAdmin({ role: 'admin' }, vic.version),
    );
    const stale = await api.call(
      'PATCH',
      `/v1/admin/staff/${vic.id}`,
      fixture.asAdmin({ role: 'support' }, vic.version),
    );
    const removed = await api.call(
      'DELETE',
      `/v1/admin/staff/${ana.id}`,
      fixture.asAdmin(undefined, ana.version),
    );
    const afterwards = await api.call('GET', '/v1/admin/staff', fixture.asAdmin());
    const me = await api.call('GET', '/v1/me', fixture.asAdmin());

    expect(demoteLast.statusCode).toBe(409);
    expect(demoteLast.json()).toMatchObject({ code: 'last_admin' });
    expect(removeLast.statusCode).toBe(409);
    expect(promoted.json()).toMatchObject({ role: 'admin', version: vic.version + 1 });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: 'version_conflict' });
    expect(removed.statusCode).toBe(200);
    expect(removed.json().removed_at).not.toBeNull();
    expect(afterwards.statusCode).toBe(403);
    expect(afterwards.json()).toMatchObject({ code: 'not_platform_staff' });
    expect(me.json()).toMatchObject({ is_platform_staff: false, platform: null });
  });

  it('keeps a platform-wide audit log that staff can filter by tenant', async () => {
    const all = await api.call('GET', '/v1/admin/audit-log?limit=100', {
      token: fixture.viewerToken,
    });
    const acmeOnly = await api.call(`GET`, `/v1/admin/audit-log?tenant_id=${fixture.acme}`, {
      token: fixture.viewerToken,
    });
    const asOwner = await api.call('GET', '/v1/admin/audit-log', fixture.asOwner());

    expect(all.statusCode).toBe(200);
    expect(all.json().items).toContainEqual(
      expect.objectContaining({
        action: 'admin.staff_added',
        actor_type: 'platform',
        tenant_id: null,
        target_label: 'sam@wattwisely.test',
      }),
    );
    expect(all.json().items).toContainEqual(
      expect.objectContaining({ action: 'admin.staff_removed', after: expect.any(Object) }),
    );
    expect(acmeOnly.json().items).toEqual([]);
    expect(asOwner.statusCode).toBe(403);
  });
});
