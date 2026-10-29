import { expect, test } from '@playwright/test';
import { Client } from 'pg';
import { ApiClient } from '../support/api-client';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 12 (hardening and operations), module 16 (API keys) and module 17 (the WhatsApp
// webhook): what the API promises to callers that are not a browser.
test.describe('The public API', () => {
  const fleetTool = new ApiClient(DemoUsers.FLEET_API_KEY);

  test('the OpenAPI document describes the v1 API', { tag: ['@module-16'] }, async () => {
    const answer = await new ApiClient().get('/docs-json');
    expect(answer.status).toBe(200);
    const document = answer.body as { openapi: string; paths: Record<string, unknown> };
    expect(document.openapi).toMatch(/^3\./);
    expect(Object.keys(document.paths)).toEqual(
      expect.arrayContaining(['/v1/sites', '/v1/chargers']),
    );
  });

  test(
    'an API key reads what its permissions allow and nothing more',
    { tag: ['@module-16'] },
    async () => {
      const sites = await fleetTool.get('/v1/sites');
      expect(sites.status).toBe(200);
      expect(JSON.stringify(sites.body)).toContain('Riverside Car Park');
      expect((await fleetTool.get('/v1/chargers')).status).toBe(200);
      expect((await fleetTool.get('/v1/drivers')).status).toBe(403);
      expect(
        (await fleetTool.call('POST', '/v1/sites', { body: { name: 'Not allowed' } })).status,
      ).toBe(403);
    },
  );

  test(
    'a missing or unknown API key gets 401 with a problem document',
    { tag: ['@module-12', '@module-16'] },
    async () => {
      const anonymous = await new ApiClient().get('/v1/sites');
      expect(anonymous.status).toBe(401);
      expect(anonymous.headers.get('content-type')).toContain('application/problem+json');
      expect(
        (await new ApiClient('wwk_not-a-real-key-000000000000000000000000000000').get('/v1/sites'))
          .status,
      ).toBe(401);
    },
  );

  test(
    'an id from another tenant, or none at all, is 404 rather than 403',
    { tag: ['@module-2', '@module-16'] },
    async () => {
      expect((await fleetTool.get('/v1/sites/01900000-0000-7000-8000-0000000fffff')).status).toBe(
        404,
      );
      expect((await fleetTool.get(`/v1/sites/${DemoUsers.RIVERSIDE_ID}`)).status).toBe(200);
    },
  );

  test(
    'row-level security shows the app role nothing without a tenant, and only that tenant’s rows with one',
    { tag: ['@module-1', '@module-2'] },
    async () => {
      const client = new Client({
        connectionString: StackUrls.DATABASE.replace(
          'wattwisely:e2e-postgres',
          'wattwisely_app:e2e-app',
        ),
      });
      await client.connect();
      try {
        expect((await client.query('select count(*)::int as n from sites')).rows[0].n).toBe(0);
        await client.query('begin');
        await client.query("select set_config('app.tenant_id', $1, true)", [
          '01900000-0000-7000-8000-00000000a002',
        ]);
        expect((await client.query('select count(*)::int as n from sites')).rows[0].n).toBe(0);
        await client.query("select set_config('app.tenant_id', $1, true)", [DemoUsers.ACME_ID]);
        expect(
          (await client.query('select count(*)::int as n from sites')).rows[0].n,
        ).toBeGreaterThanOrEqual(2);
        await client.query('rollback');
      } finally {
        await client.end();
      }
    },
  );

  test('health and metrics answer on every service', { tag: ['@module-12'] }, async () => {
    for (const base of [StackUrls.API, StackUrls.GATEWAY_HTTP, StackUrls.WORKER]) {
      expect((await fetch(`${base}/health/ready`)).status, `${base}/health/ready`).toBe(200);
      const metrics = await fetch(`${base}/metrics`);
      expect(metrics.status, `${base}/metrics`).toBe(200);
      expect(await metrics.text()).toContain('# TYPE');
    }
  });

  // Security headers (nosniff, frame-ancestors) are added by Caddy in production, not by the API.
  test(
    'an error answer is a problem document with a request id to quote to support',
    { tag: ['@module-12'] },
    async () => {
      const answer = await new ApiClient().get('/v1/sites');
      expect(answer.body).toMatchObject({
        status: 401,
        code: expect.any(String),
        request_id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      });
    },
  );

  // Finding F1: the browser apps live on other origins and send PATCH, PUT and DELETE.
  test(
    'CORS lets the portal’s origin send every method the apps use',
    { tag: ['@module-12', '@module-22'] },
    async () => {
      for (const method of ['PATCH', 'PUT', 'DELETE']) {
        const preflight = await fetch(`${StackUrls.API}/v1/branding`, {
          method: 'OPTIONS',
          headers: {
            Origin: StackUrls.PORTAL,
            'Access-Control-Request-Method': method,
            'Access-Control-Request-Headers': 'authorization,content-type',
          },
        });
        expect(preflight.headers.get('access-control-allow-origin')).toBe(StackUrls.PORTAL);
        expect(
          preflight.headers.get('access-control-allow-methods') ?? '',
          `preflight for ${method}`,
        ).toContain(method);
      }
    },
  );

  test(
    'WhatsApp webhook calls with a bad signature or verify token are refused',
    { tag: ['@module-17'] },
    async () => {
      const post = await new ApiClient().call('POST', '/v1/public/messaging/whatsapp', {
        body: { entry: [] },
        headers: { 'X-Hub-Signature-256': 'sha256=00' },
      });
      expect(post.status).toBe(400);
      expect(post.body).toMatchObject({ code: 'webhook_signature_invalid' });
      const verify = await new ApiClient().get(
        '/v1/public/messaging/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=1',
      );
      expect(verify.status).toBe(403);
    },
  );

  test(
    'the Stripe webhook says card payments are not set up on an installation without keys',
    { tag: ['@module-6'] },
    async () => {
      const answer = await new ApiClient().call('POST', '/v1/webhooks/stripe', {
        body: {},
        headers: { 'Stripe-Signature': 't=1,v1=00' },
      });
      expect(answer.status).toBe(503);
      expect(answer.body).toMatchObject({ code: 'payments_unavailable' });
    },
  );
});
