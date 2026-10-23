import { TestDatabase } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Module 12 at the API's edge: rate limits, the client's own address, metrics, docs off. */
(TestDatabase.isConfigured() ? describe : describe.skip)('API hardening', () => {
  const api = new TestApi();
  const from = (ip: string) => ({ headers: { 'x-forwarded-for': ip } });

  beforeAll(async () => {
    await api.start({
      RATE_LIMIT_ENABLED: 'true',
      RATE_LIMIT_PER_MINUTE: '5',
      RATE_LIMIT_PUBLIC_PER_MINUTE: '3',
      RATE_LIMIT_PUBLIC_WRITE_PER_MINUTE: '2',
      TRUST_PROXY_HOPS: '1',
      API_DOCS_ENABLED: 'false',
    });
  });

  afterAll(async () => api.stop());

  it('limits public reads per client address, and answers 429 with Retry-After', async () => {
    const answers = [];
    for (let index = 0; index < 4; index += 1) {
      answers.push(await api.call('GET', '/v1/public/places/nope/1', from('203.0.113.1')));
    }
    const other = await api.call('GET', '/v1/public/places/nope/1', from('203.0.113.2'));

    expect(answers.map((answer) => answer.statusCode)).toEqual([404, 404, 404, 429]);
    expect(answers[3].json()).toMatchObject({ status: 429, code: 'rate_limited' });
    expect(Number(answers[3].headers['retry-after'])).toBeGreaterThan(0);
    expect(other.statusCode).toBe(404);
  });

  it('gives public writes a smaller budget of their own', async () => {
    const statuses = [];
    for (let index = 0; index < 3; index += 1) {
      const answer = await api.call('POST', '/v1/public/charges/nope/stop', from('198.51.100.7'));
      statuses.push(answer.statusCode);
    }

    expect(statuses.slice(0, 2)).not.toContain(429);
    expect(statuses[2]).toBe(429);
    expect(
      (await api.call('GET', '/v1/public/places/nope/1', from('198.51.100.7'))).statusCode,
    ).toBe(404);
  });

  it('limits routes with a login by the default budget, and never the health checks', async () => {
    const statuses = [];
    for (let index = 0; index < 6; index += 1) {
      statuses.push((await api.call('GET', '/v1/me', from('192.0.2.50'))).statusCode);
    }
    const health = [];
    for (let index = 0; index < 10; index += 1) {
      health.push((await api.call('GET', '/health/live', from('192.0.2.50'))).statusCode);
    }

    expect(statuses).toEqual([401, 401, 401, 401, 401, 429]);
    expect(new Set(health)).toEqual(new Set([200]));
  });

  it('serves Prometheus metrics outside /v1, with route patterns instead of addresses', async () => {
    const response = await api.call('GET', '/metrics');

    expect(response.statusCode).toBe(200);
    expect(response.headers['content-type']).toContain('text/plain');
    expect(response.body).toContain(
      'wattwisely_http_request_duration_seconds_count{service="api",method="GET",route="/v1/public/places/:identity/:connector",status="429"} 1',
    );
    expect(response.body).toContain(
      'wattwisely_http_rate_limited_total{policy="public",service="api"} 1',
    );
    expect(response.body).not.toContain('/v1/public/places/nope');
    expect((await api.call('GET', '/v1/metrics')).statusCode).toBe(404);
  });

  it('leaves out the OpenAPI pages when they are switched off', async () => {
    expect((await api.call('GET', '/docs')).statusCode).toBe(404);
  });
});
