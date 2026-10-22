import { Test } from '@nestjs/testing';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { ApiServer } from './api.server';
import { AppModule } from './app.module';
import { KeycloakKeySetProvider } from './common/auth/keycloak-key-set.provider';
import { TestTokenIssuer } from './testing/test-token.issuer';

/**
 * Runs the real API in memory (all modules, guards and error handling) with a
 * fake Keycloak, and walks through the login and tenant rules end to end.
 */
describe('API authentication and tenant flow', () => {
  const acme = { 'acme-charging': { id: 'org-acme' } };
  const both = { 'acme-charging': { id: 'org-acme' }, 'volt-hotels': { id: 'org-volt' } };
  let app: NestFastifyApplication;
  let issuer: TestTokenIssuer;

  beforeAll(async () => {
    issuer = await new TestTokenIssuer().init();
    process.env['KEYCLOAK_ISSUER_URL'] = TestTokenIssuer.ISSUER;
    process.env['CORS_ORIGINS'] = 'http://portal.test';
    process.env['LOG_LEVEL'] = 'silent';
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KeycloakKeySetProvider)
      .useValue({ getKeySet: () => issuer.getKeySet(), isReachable: async () => true })
      .compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(ApiServer.createAdapter(), {
      logger: false,
    });
    ApiServer.configure(app);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  const get = async (url: string, headers: Record<string, string> = {}) =>
    app.inject({ method: 'GET', url, headers });

  it('serves health checks without a login', async () => {
    expect((await get('/health/live')).statusCode).toBe(200);
    expect((await get('/health/ready')).json()).toEqual({
      status: 'ok',
      checks: { keycloak: 'ok' },
    });
  });

  it('refuses a request without a token with a problem+json body', async () => {
    const response = await get('/v1/me');

    expect(response.statusCode).toBe(401);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ code: 'token_missing', status: 401 });
  });

  it('refuses a forged token', async () => {
    const response = await get('/v1/me', { authorization: 'Bearer abc.def.ghi' });

    expect(response.json()).toMatchObject({ code: 'token_invalid' });
  });

  it('returns the user and their tenants from GET /v1/me', async () => {
    const token = await issuer.sign({
      email: 'multi@demo.test',
      name: 'Mia Multi',
      organization: both,
    });

    const response = await get('/v1/me', { authorization: `Bearer ${token}` });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      id: 'user-1',
      email: 'multi@demo.test',
      name: 'Mia Multi',
      is_platform_staff: false,
      tenants: [
        { id: 'org-acme', alias: 'acme-charging' },
        { id: 'org-volt', alias: 'volt-hotels' },
      ],
    });
  });

  it('uses the only tenant when the user has one', async () => {
    const token = await issuer.sign({ organization: acme });

    const response = await get('/v1/tenant', { authorization: `Bearer ${token}` });

    expect(response.json()).toEqual({ id: 'org-acme', alias: 'acme-charging' });
  });

  it('switches tenant with X-Tenant-Id', async () => {
    const token = await issuer.sign({ organization: both });

    const response = await get('/v1/tenant', {
      authorization: `Bearer ${token}`,
      'x-tenant-id': 'org-volt',
    });

    expect(response.json()).toEqual({ id: 'org-volt', alias: 'volt-hotels' });
  });

  it('answers 404 when X-Tenant-Id names a tenant the user is not in', async () => {
    const token = await issuer.sign({ organization: acme });

    const response = await get('/v1/tenant', {
      authorization: `Bearer ${token}`,
      'x-tenant-id': 'org-volt',
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({ code: 'tenant_not_found' });
  });
});
