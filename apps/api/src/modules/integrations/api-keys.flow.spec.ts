import { TestData, TestDatabase, TestPerson, TestPlatform } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Module 16: API keys, made by a tenant and calling the API within their chosen permissions. */
(TestDatabase.isConfigured() ? describe : describe.skip)('API keys', () => {
  const api = new TestApi();
  const riverside = {
    name: 'Riverside Car Park',
    address: { line1: '12 Thames Path', city: 'London', postal_code: 'SE1 2AA', country: 'GB' },
    latitude: 51.5055,
    longitude: -0.0754,
    time_zone: 'Europe/London',
  };
  let acme: string;
  let volt: string;
  let olivia: TestPerson;
  let owner: string;
  let created: { id: string; version: number; token: string };

  beforeAll(async () => {
    await api.start({
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_PER_MINUTE: '100000',
      RATE_LIMIT_API_KEY_PER_MINUTE: '10',
    });
    acme = await api.data.tenant('acme-charging');
    volt = await api.data.tenant('volt-hotels');
    await api.platform.subscription(acme, TestPlatform.PLAN_IDS.growth);
    await api.platform.subscription(volt, TestPlatform.PLAN_IDS.starter);
    olivia = await api.data.person('olivia@acme.test', 'Olivia');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    await api.data.member(volt, olivia, TestData.ROLE_IDS.owner);
    owner = await api.issuer.signFor(olivia);
  });

  afterAll(async () => api.stop());

  it('makes a key, shows the token once, lists it with a hint and writes the audit log', async () => {
    const answer = await api.call('POST', '/v1/api-keys', {
      token: owner,
      tenantId: acme,
      body: {
        name: ' Fleet sync ',
        description: 'Reads sessions every night.',
        permissions: ['sites:read', 'sessions:read', 'sites:read'],
      },
    });

    expect(answer.statusCode).toBe(201);
    const body = answer.json();
    expect(body.token).toMatch(/^wwk_[A-Za-z0-9_-]{43}$/);
    expect(body.key).toMatchObject({
      name: 'Fleet sync',
      description: 'Reads sessions every night.',
      key_hint: `wwk_…${body.token.slice(-4)}`,
      permissions: ['sessions:read', 'sites:read'],
      created_by: 'Olivia',
      status: 'active',
      expires_at: null,
      last_used_at: null,
      version: 1,
    });
    created = { id: body.key.id, version: 1, token: body.token };
    const list = await api.call('GET', '/v1/api-keys', { token: owner, tenantId: acme });
    expect(list.json()).toHaveLength(1);
    expect(JSON.stringify(list.json())).not.toContain(body.token);
    const audit = await api.call('GET', '/v1/audit-log?target_type=api_key', {
      token: owner,
      tenantId: acme,
    });
    expect(audit.json().items[0]).toMatchObject({
      action: 'api_keys.created',
      actor_type: 'user',
      target_label: 'Fleet sync',
    });
  });

  it('lets the key read what it may, in its tenant only, and nothing about people', async () => {
    const sites = await api.call('GET', '/v1/sites', { token: created.token });
    const otherTenant = await api.call('GET', '/v1/sites', {
      token: created.token,
      tenantId: volt,
    });
    const sameTenant = await api.call('GET', '/v1/sites', { token: created.token, tenantId: acme });
    const me = await api.call('GET', '/v1/me', { token: created.token });
    const admin = await api.call('GET', '/v1/admin/tenants', { token: created.token });
    const write = await api.call('POST', '/v1/sites', { token: created.token, body: riverside });
    const keys = await api.call('GET', '/v1/api-keys', { token: created.token });
    const permissions = await api.call('GET', '/v1/me/permissions', { token: created.token });

    expect(sites.statusCode).toBe(200);
    expect(sameTenant.statusCode).toBe(200);
    expect(otherTenant.statusCode).toBe(404);
    expect(me.statusCode).toBe(403);
    expect(me.json().code).toBe('api_key_not_allowed');
    expect(admin.json().code).toBe('api_key_not_allowed');
    expect(write.statusCode).toBe(403);
    expect(write.json().code).toBe('permission_denied');
    expect(keys.json().code).toBe('permission_denied');
    expect(permissions.json().roles).toEqual([
      { role_id: created.id, key: 'api_key', name: 'Fleet sync', site_id: null },
    ]);
    const listed = await api.call('GET', `/v1/api-keys/${created.id}`, {
      token: owner,
      tenantId: acme,
    });
    expect(listed.json().last_used_at).not.toBeNull();
  });

  it('records what a key changes as the key, acting for the member who made it', async () => {
    const writer = await api.integrations.apiKey(
      acme,
      olivia.accountId,
      ['sites:write', 'sites:read'],
      {
        name: 'Site importer',
      },
    );

    const answer = await api.call('POST', '/v1/sites', { token: writer.token, body: riverside });
    const audit = await api.call('GET', '/v1/audit-log?actor_type=api_key', {
      token: owner,
      tenantId: acme,
    });

    expect(answer.statusCode).toBe(201);
    expect(audit.json().items[0]).toMatchObject({
      action: 'sites.created',
      actor_type: 'api_key',
      actor_id: writer.id,
      actor_label: 'API key "Site importer"',
    });
  });

  it('renames a key, then revokes it, and the key stops at once', async () => {
    const renamed = await api.call('PATCH', `/v1/api-keys/${created.id}`, {
      token: owner,
      tenantId: acme,
      version: created.version,
      body: { name: 'Fleet sync (nightly)' },
    });
    const noVersion = await api.call('DELETE', `/v1/api-keys/${created.id}`, {
      token: owner,
      tenantId: acme,
    });
    const revoked = await api.call('DELETE', `/v1/api-keys/${created.id}`, {
      token: owner,
      tenantId: acme,
      version: 2,
    });
    const afterwards = await api.call('GET', '/v1/sites', { token: created.token });
    const again = await api.call('DELETE', `/v1/api-keys/${created.id}`, {
      token: owner,
      tenantId: acme,
      version: 3,
    });

    expect(renamed.statusCode).toBe(200);
    expect(renamed.json()).toMatchObject({ name: 'Fleet sync (nightly)', version: 2 });
    expect(noVersion.statusCode).toBe(428);
    expect(revoked.statusCode).toBe(200);
    expect(revoked.json()).toMatchObject({ status: 'revoked', version: 3 });
    expect(revoked.json().revoked_at).not.toBeNull();
    expect(afterwards.statusCode).toBe(401);
    expect(afterwards.json().code).toBe('api_key_revoked');
    expect(again.statusCode).toBe(409);
    expect(again.json().code).toBe('api_key_revoked');
    const audit = await api.call('GET', '/v1/audit-log?target_type=api_key', {
      token: owner,
      tenantId: acme,
    });
    expect(
      audit
        .json()
        .items.map((entry: { action: string }) => entry.action)
        .slice(0, 2),
    ).toEqual(['api_keys.revoked', 'api_keys.updated']);
  });
});
