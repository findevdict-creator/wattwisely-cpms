import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from './testing/test-api';

/**
 * Runs the real API in memory on a fresh Postgres database with a fake Keycloak,
 * and walks through the login and tenant rules end to end.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('API login and tenant flow', () => {
  const api = new TestApi();
  let acme: string;
  let volt: string;
  let mia: TestPerson;
  let solo: TestPerson;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    volt = await api.data.tenant('volt-hotels');
    mia = await api.data.person('mia@demo.test', 'Mia Multi');
    solo = await api.data.person('solo@demo.test');
    await api.data.member(acme, mia, TestData.ROLE_IDS.owner);
    await api.data.member(volt, mia, TestData.ROLE_IDS.readOnly);
    await api.data.member(acme, solo, TestData.ROLE_IDS.technician);
  });

  afterAll(async () => api.stop());

  it('serves health checks without a login, including the database', async () => {
    expect((await api.call('GET', '/health/live')).statusCode).toBe(200);
    expect((await api.call('GET', '/health/ready')).json()).toEqual({
      status: 'ok',
      checks: { keycloak: 'ok', database: 'ok' },
    });
  });

  it('refuses a request without a token with a problem+json body', async () => {
    const response = await api.call('GET', '/v1/me');

    expect(response.statusCode).toBe(401);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'token_missing', status: 401 });
  });

  it('refuses a forged token', async () => {
    const response = await api.call('GET', '/v1/me', { token: 'abc.def.ghi' });

    expect(response.json()).toMatchObject({ code: 'token_invalid' });
  });

  it('returns the user and their tenants from GET /v1/me', async () => {
    const response = await api.call('GET', '/v1/me', { token: await api.issuer.signFor(mia) });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: mia.accountId,
      email: 'mia@demo.test',
      name: 'Mia Multi',
      is_platform_staff: false,
      tenants: [
        { id: acme, slug: 'acme-charging', name: 'acme charging', status: 'active' },
        { id: volt, slug: 'volt-hotels', name: 'volt hotels', status: 'active' },
      ],
    });
  });

  it('creates an account on first login with a verified e-mail, with no tenants yet', async () => {
    const token = await api.issuer.sign({ sub: 'kc-new', email: 'new@demo.test' });

    const response = await api.call('GET', '/v1/me', { token });

    expect(response.json()).toMatchObject({ email: 'new@demo.test', tenants: [] });
    expect(response.json().id).toEqual(expect.any(String));
  });

  it('never links an account through an unverified e-mail', async () => {
    const token = await api.issuer.sign({
      sub: 'kc-attacker',
      email: 'mia@demo.test',
      email_verified: false,
    });

    const me = await api.call('GET', '/v1/me', { token });
    const tenant = await api.call('GET', '/v1/tenant', { token });

    expect(me.json()).toMatchObject({ id: null, tenants: [] });
    expect(tenant.statusCode).toBe(403);
    expect(tenant.json()).toMatchObject({ code: 'account_unverified' });
  });

  it('uses the only tenant when the user has one', async () => {
    const response = await api.call('GET', '/v1/tenant', { token: await api.issuer.signFor(solo) });

    expect(response.json()).toEqual({
      id: acme,
      slug: 'acme-charging',
      name: 'acme charging',
      status: 'active',
    });
  });

  it('asks for X-Tenant-Id when the user has several tenants', async () => {
    const response = await api.call('GET', '/v1/tenant', { token: await api.issuer.signFor(mia) });

    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ code: 'tenant_required' });
  });

  it('switches tenant with X-Tenant-Id', async () => {
    const token = await api.issuer.signFor(mia);

    const response = await api.call('GET', '/v1/tenant', { token, tenantId: volt });

    expect(response.json()).toMatchObject({ id: volt, slug: 'volt-hotels' });
  });

  it('answers 404 when X-Tenant-Id names a tenant the user is not in', async () => {
    const token = await api.issuer.signFor(solo);

    for (const tenantId of [volt, 'not-a-uuid']) {
      const response = await api.call('GET', '/v1/tenant', { token, tenantId });
      expect(response.statusCode).toBe(404);
      expect(response.json()).toMatchObject({ code: 'tenant_not_found' });
    }
  });
});
