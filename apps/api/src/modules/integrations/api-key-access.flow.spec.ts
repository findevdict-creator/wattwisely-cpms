import { TestData, TestDatabase, TestPerson, TestPlatform } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Module 16: what a key may hold, when a key is refused, and the budget each key gets. */
(TestDatabase.isConfigured() ? describe : describe.skip)('API key access', () => {
  const api = new TestApi();
  let acme: string;
  let volt: string;
  let olivia: TestPerson;
  let owner: string;

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

  it('keeps a key within the maker’s access and refuses what a key must not hold', async () => {
    const unknown = await api.call('POST', '/v1/api-keys', {
      token: owner,
      tenantId: acme,
      body: { name: 'Pilot', permissions: ['chargers:fly'] },
    });
    const selfServing = await api.call('POST', '/v1/api-keys', {
      token: owner,
      tenantId: acme,
      body: { name: 'Key maker', permissions: ['api_keys:manage'] },
    });
    const pastExpiry = await api.call('POST', '/v1/api-keys', {
      token: owner,
      tenantId: acme,
      body: { name: 'Old', permissions: ['sites:read'], expires_at: '2020-01-01T00:00:00Z' },
    });
    const integratorRole = await api.data.customRole(acme, 'Integrator', [
      'api_keys:manage',
      'sites:read',
    ]);
    const priya = await api.data.person('priya@acme.test', 'Priya');
    await api.data.member(acme, priya, integratorRole);
    const beyond = await api.call('POST', '/v1/api-keys', {
      token: await api.issuer.signFor(priya),
      tenantId: acme,
      body: { name: 'Commander', permissions: ['sites:read', 'chargers:command'] },
    });
    const technician = await api.data.person('theo@acme.test', 'Theo');
    await api.data.member(acme, technician, TestData.ROLE_IDS.technician);
    const noRight = await api.call('GET', '/v1/api-keys', {
      token: await api.issuer.signFor(technician),
      tenantId: acme,
    });

    expect(unknown.statusCode).toBe(422);
    expect(unknown.json().code).toBe('permission_unknown');
    expect(selfServing.statusCode).toBe(422);
    expect(selfServing.json().code).toBe('permission_not_for_api_keys');
    expect(pastExpiry.statusCode).toBe(422);
    expect(pastExpiry.json().code).toBe('api_key_expiry_in_past');
    expect(beyond.statusCode).toBe(403);
    expect(beyond.json().code).toBe('role_exceeds_own_access');
    expect(noRight.statusCode).toBe(403);
  });

  it('is a plan module: no keys on Starter, and a key stops working when the plan loses it', async () => {
    const onStarter = await api.call('POST', '/v1/api-keys', {
      token: owner,
      tenantId: volt,
      body: { name: 'Hotel', permissions: ['sites:read'] },
    });
    const voltKey = await api.integrations.apiKey(volt, olivia.accountId, ['sites:read']);
    const used = await api.call('GET', '/v1/sites', { token: voltKey.token });

    expect(onStarter.statusCode).toBe(403);
    expect(onStarter.json().code).toBe('module_not_in_plan');
    expect(used.statusCode).toBe(403);
    expect(used.json().code).toBe('module_not_in_plan');
  });

  it('refuses a token nobody made, an expired key and a revoked one', async () => {
    const expired = await api.integrations.apiKey(acme, olivia.accountId, ['sites:read'], {
      expiresAt: new Date(Date.now() - 1000),
    });
    const revokedBefore = await api.integrations.apiKey(acme, olivia.accountId, ['sites:read'], {
      revokedAt: new Date(),
    });

    const bogus = await api.call('GET', '/v1/sites', { token: 'wwk_nobody-made-this-token' });
    const stale = await api.call('GET', '/v1/sites', { token: expired.token });
    const gone = await api.call('GET', '/v1/sites', { token: revokedBefore.token });

    expect(bogus.statusCode).toBe(401);
    expect(bogus.json().code).toBe('api_key_invalid');
    expect(stale.json().code).toBe('api_key_expired');
    expect(gone.json().code).toBe('api_key_revoked');
    const listed = await api.call('GET', '/v1/api-keys', { token: owner, tenantId: acme });
    const statuses = listed
      .json()
      .map((key: { id: string; status: string }) => [key.id, key.status]);
    expect(statuses).toContainEqual([expired.id, 'expired']);
    expect(statuses).toContainEqual([revokedBefore.id, 'revoked']);
  });

  it('gives each key its own budget for the minute', async () => {
    const busy = await api.integrations.apiKey(acme, olivia.accountId, ['sites:read']);
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      statuses.push((await api.call('GET', '/v1/sites', { token: busy.token })).statusCode);
    }
    const person = await api.call('GET', '/v1/sites', { token: owner, tenantId: acme });

    expect(statuses.slice(0, 10)).toEqual(Array(10).fill(200));
    expect(statuses[10]).toBe(429);
    expect(person.statusCode).toBe(200);
  });
});
