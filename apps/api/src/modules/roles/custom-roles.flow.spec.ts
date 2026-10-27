import { TestData, TestDatabase, TestPerson, TestPlatform } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Module 14: custom roles, shaped by the tenant within the plan and its own access. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Custom roles', () => {
  const api = new TestApi();
  let acme: string;
  let owner: string;
  let theo: TestPerson;
  let theoMembership: string;
  let supervisor: { id: string; version: number };

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    await api.platform.subscription(acme, TestPlatform.PLAN_IDS.growth);
    const olivia = await api.data.person('olivia@acme.test', 'Olivia');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    owner = await api.issuer.signFor(olivia);
    theo = await api.data.person('theo@acme.test', 'Theo');
    theoMembership = await api.data.member(acme, theo, TestData.ROLE_IDS.technician);
  });

  afterAll(async () => api.stop());

  it('creates a custom role, lists it with the built-in ones and writes the audit log', async () => {
    const created = await api.call('POST', '/v1/roles', {
      token: owner,
      body: {
        name: ' Depot supervisor ',
        description: 'Runs the depot.',
        permissions: ['drivers:write', 'chargers:command', 'chargers:read', 'drivers:read'],
      },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      key: null,
      name: 'Depot supervisor',
      description: 'Runs the depot.',
      is_system: false,
      permissions: ['chargers:command', 'chargers:read', 'drivers:read', 'drivers:write'],
      member_count: 0,
      version: 1,
    });
    supervisor = { id: created.json().id, version: 1 };
    const roles = await api.call('GET', '/v1/roles', { token: owner });
    const names = roles.json().map((role: { name: string }) => role.name);
    expect(names.slice(0, 5)).toEqual([
      'Owner',
      'Operations',
      'Finance',
      'Technician',
      'Read-only',
    ]);
    expect(names).toContain('Depot supervisor');
    const one = await api.call('GET', `/v1/roles/${supervisor.id}`, { token: owner });
    expect(one.json()).toMatchObject({ name: 'Depot supervisor', is_system: false });
    const audit = await api.call('GET', '/v1/audit-log?target_type=role', { token: owner });
    const entry = audit.json().items[0];
    const detail = await api.call('GET', `/v1/audit-log/${entry.id}`, { token: owner });
    expect(entry).toMatchObject({ action: 'roles.created', target_label: 'Depot supervisor' });
    expect(detail.json().after).toEqual({
      name: 'Depot supervisor',
      description: 'Runs the depot.',
      permissions: ['chargers:command', 'chargers:read', 'drivers:read', 'drivers:write'],
    });
  });

  it('refuses an unknown permission, a used name and changes to built-in roles', async () => {
    const unknown = await api.call('POST', '/v1/roles', {
      token: owner,
      body: { name: 'Pilot', permissions: ['chargers:fly'] },
    });
    const sameName = await api.call('POST', '/v1/roles', {
      token: owner,
      body: { name: 'technician', permissions: ['chargers:read'] },
    });
    const editSystem = await api.call('PATCH', `/v1/roles/${TestData.ROLE_IDS.technician}`, {
      token: owner,
      body: { name: 'Fixer' },
      version: 1,
    });
    const deleteSystem = await api.call('DELETE', `/v1/roles/${TestData.ROLE_IDS.readOnly}`, {
      token: owner,
      version: 1,
    });
    const noVersion = await api.call('PATCH', `/v1/roles/${supervisor.id}`, {
      token: owner,
      body: { name: 'Depot lead' },
    });

    expect(unknown.statusCode).toBe(422);
    expect(unknown.json().code).toBe('permission_unknown');
    expect(sameName.statusCode).toBe(409);
    expect(sameName.json().code).toBe('role_name_taken');
    expect(editSystem.statusCode).toBe(409);
    expect(editSystem.json().code).toBe('role_is_system');
    expect(deleteSystem.json().code).toBe('role_is_system');
    expect(noVersion.statusCode).toBe(428);
  });

  it("gives the role to a member, whose access follows the role's changes at once", async () => {
    const given = await api.call('PUT', `/v1/members/${theoMembership}/roles`, {
      token: owner,
      body: { roles: [{ role_id: supervisor.id }] },
    });
    const theoToken = await api.issuer.signFor(theo);
    const before = await api.call('GET', '/v1/me/permissions', { token: theoToken });

    const changed = await api.call('PATCH', `/v1/roles/${supervisor.id}`, {
      token: owner,
      body: { permissions: ['chargers:read', 'chargers:command', 'sessions:read'] },
      version: 1,
    });
    const after = await api.call('GET', '/v1/me/permissions', { token: theoToken });

    expect(given.statusCode).toBe(200);
    expect(before.json().roles).toEqual([
      { role_id: supervisor.id, key: null, name: 'Depot supervisor', site_id: null },
    ]);
    expect(before.json().permissions).toContainEqual({ key: 'drivers:write', site_ids: null });
    expect(changed.json()).toMatchObject({ member_count: 1, version: 2 });
    expect(after.json().permissions).toContainEqual({ key: 'sessions:read', site_ids: null });
    expect(after.json().permissions).not.toContainEqual(
      expect.objectContaining({ key: 'drivers:write' }),
    );
    supervisor.version = 2;
  });

  it('lets a holder of custom_roles:manage shape roles only within their own access', async () => {
    const roleAdmin = await api.call('POST', '/v1/roles', {
      token: owner,
      body: {
        name: 'Role admin',
        permissions: ['custom_roles:manage', 'team:read', 'chargers:read'],
      },
    });
    const priya = await api.data.person('priya@acme.test', 'Priya');
    await api.data.member(acme, priya, roleAdmin.json().id);
    const priyaToken = await api.issuer.signFor(priya);

    const tooMuch = await api.call('POST', '/v1/roles', {
      token: priyaToken,
      body: { name: 'Team lead', permissions: ['team:manage'] },
    });
    const withinReach = await api.call('POST', '/v1/roles', {
      token: priyaToken,
      body: { name: 'Charger viewer', permissions: ['chargers:read'] },
    });

    expect(tooMuch.statusCode).toBe(403);
    expect(tooMuch.json().code).toBe('role_exceeds_own_access');
    expect(withinReach.statusCode).toBe(201);
  });

  it('deletes a role once nobody holds it, at the version seen', async () => {
    const inUse = await api.call('DELETE', `/v1/roles/${supervisor.id}`, {
      token: owner,
      version: supervisor.version,
    });
    await api.call('PUT', `/v1/members/${theoMembership}/roles`, {
      token: owner,
      body: { roles: [{ role_id: TestData.ROLE_IDS.technician }] },
    });
    const stale = await api.call('DELETE', `/v1/roles/${supervisor.id}`, {
      token: owner,
      version: 1,
    });
    const removed = await api.call('DELETE', `/v1/roles/${supervisor.id}`, {
      token: owner,
      version: supervisor.version,
    });
    const gone = await api.call('GET', `/v1/roles/${supervisor.id}`, { token: owner });
    const giveGone = await api.call('PUT', `/v1/members/${theoMembership}/roles`, {
      token: owner,
      body: { roles: [{ role_id: supervisor.id }] },
    });

    expect(inUse.statusCode).toBe(409);
    expect(inUse.json()).toMatchObject({
      code: 'role_in_use',
      detail: expect.stringContaining('1 person'),
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().code).toBe('version_conflict');
    expect(removed.statusCode).toBe(204);
    expect(gone.statusCode).toBe(404);
    expect(giveGone.statusCode).toBe(422);
    expect(giveGone.json().code).toBe('role_not_found');
  });

  it('keeps custom roles inside their tenant and behind the plan', async () => {
    const volt = await api.data.tenant('volt-hotels');
    await api.platform.subscription(volt, TestPlatform.PLAN_IDS.starter);
    const mia = await api.data.person('mia@volt.test', 'Mia');
    const miaMembership = await api.data.member(volt, mia, TestData.ROLE_IDS.owner);
    const miaToken = await api.issuer.signFor(mia);
    const acmeRoles = await api.call('GET', '/v1/roles', { token: owner });
    const roleAdmin = acmeRoles.json().find((role: { name: string }) => role.name === 'Role admin');

    const voltRoles = await api.call('GET', '/v1/roles', { token: miaToken });
    const locked = await api.call('POST', '/v1/roles', {
      token: miaToken,
      body: { name: 'Night porter', permissions: ['chargers:read'] },
    });
    const foreign = await api.call('PUT', `/v1/members/${miaMembership}/roles`, {
      token: miaToken,
      body: { roles: [{ role_id: TestData.ROLE_IDS.owner }, { role_id: roleAdmin.id }] },
    });

    expect(voltRoles.json().every((role: { is_system: boolean }) => role.is_system)).toBe(true);
    expect(locked.statusCode).toBe(403);
    expect(locked.json().code).toBe('module_not_in_plan');
    expect(foreign.statusCode).toBe(422);
    expect(foreign.json().code).toBe('role_not_found');
  });
});
