import { TestData, TestDatabase, TestPlatform } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Module 16: webhook endpoints, where a tenant's systems hear about sessions and alerts. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Webhooks', () => {
  const api = new TestApi();
  let acme: string;
  let owner: string;
  let endpoint: { id: string; version: number; secret: string };

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    await api.platform.subscription(acme, TestPlatform.PLAN_IDS.growth);
    const olivia = await api.data.person('olivia@acme.test', 'Olivia');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    owner = await api.issuer.signFor(olivia);
  });

  afterAll(async () => api.stop());

  it('offers the event catalogue and adds an endpoint with a secret and clean event types', async () => {
    const types = await api.call('GET', '/v1/webhooks/event-types', { token: owner });
    const answer = await api.call('POST', '/v1/webhooks', {
      token: owner,
      body: {
        url: ' https://hooks.acme.example/wattwisely ',
        description: 'The fleet system',
        event_types: ['alert.opened', 'session.completed', 'session.completed'],
      },
    });

    expect(types.json().map((type: { key: string }) => type.key)).toEqual([
      'session.started',
      'session.completed',
      'session.failed',
      'alert.opened',
      'alert.closed',
    ]);
    expect(answer.statusCode).toBe(201);
    expect(answer.json()).toMatchObject({
      url: 'https://hooks.acme.example/wattwisely',
      description: 'The fleet system',
      event_types: ['session.completed', 'alert.opened'],
      is_active: true,
      failure_count: 0,
      last_delivery_at: null,
      version: 1,
    });
    expect(answer.json().secret).toMatch(/^whsec_[A-Za-z0-9_-]{43}$/);
    endpoint = { id: answer.json().id, version: 1, secret: answer.json().secret };
    const list = await api.call('GET', '/v1/webhooks', { token: owner });
    expect(list.json()).toHaveLength(1);
    const audit = await api.call('GET', '/v1/audit-log?target_type=webhook', { token: owner });
    expect(audit.json().items[0]).toMatchObject({
      action: 'webhooks.created',
      target_label: 'https://hooks.acme.example/wattwisely',
    });
  });

  it('refuses an unknown event type and an address inside the network', async () => {
    const unknown = await api.call('POST', '/v1/webhooks', {
      token: owner,
      body: { url: 'https://hooks.acme.example', event_types: ['charger.exploded'] },
    });
    const local = await api.call('POST', '/v1/webhooks', {
      token: owner,
      body: { url: 'https://localhost:3200/health', event_types: ['alert.opened'] },
    });
    const privateIp = await api.call('POST', '/v1/webhooks', {
      token: owner,
      body: { url: 'http://10.0.0.5/hook', event_types: ['alert.opened'] },
    });
    const scheme = await api.call('POST', '/v1/webhooks', {
      token: owner,
      body: { url: 'ftp://hooks.acme.example', event_types: ['alert.opened'] },
    });

    expect(unknown.statusCode).toBe(422);
    expect(unknown.json().code).toBe('webhook_event_unknown');
    expect(local.statusCode).toBe(422);
    expect(local.json().code).toBe('webhook_url_refused');
    expect(privateIp.json().code).toBe('webhook_url_refused');
    expect(scheme.json().code).toBe('webhook_url_refused');
  });

  it('changes the endpoint with the version seen, and pauses it', async () => {
    const noVersion = await api.call('PATCH', `/v1/webhooks/${endpoint.id}`, {
      token: owner,
      body: { is_active: false },
    });
    const paused = await api.call('PATCH', `/v1/webhooks/${endpoint.id}`, {
      token: owner,
      version: 1,
      body: { is_active: false, event_types: ['session.started'] },
    });
    const stale = await api.call('PATCH', `/v1/webhooks/${endpoint.id}`, {
      token: owner,
      version: 1,
      body: { description: 'Late' },
    });

    expect(noVersion.statusCode).toBe(428);
    expect(paused.statusCode).toBe(200);
    expect(paused.json()).toMatchObject({
      is_active: false,
      event_types: ['session.started'],
      secret: endpoint.secret,
      version: 2,
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json().code).toBe('version_conflict');
    endpoint.version = 2;
  });

  it('queues a test ping that the worker will send, and lists it among the deliveries', async () => {
    const test = await api.call('POST', `/v1/webhooks/${endpoint.id}/test`, { token: owner });
    const deliveries = await api.call('GET', `/v1/webhooks/${endpoint.id}/deliveries?limit=10`, {
      token: owner,
    });

    expect(test.statusCode).toBe(202);
    expect(test.json()).toMatchObject({
      event_type: 'ping',
      status: 'pending',
      attempts: 0,
      last_status_code: null,
    });
    expect(test.json().payload).toMatchObject({
      id: test.json().id,
      type: 'ping',
      tenant_id: acme,
      data: { endpoint_id: endpoint.id },
    });
    expect(deliveries.json()).toHaveLength(1);
    expect(deliveries.json()[0].id).toBe(test.json().id);
  });

  it('is for api_keys:manage only, within the tenant', async () => {
    const other = await api.data.tenant('volt-hotels');
    await api.platform.subscription(other, TestPlatform.PLAN_IDS.growth);
    const mia = await api.data.person('mia@volt.test', 'Mia');
    await api.data.member(other, mia, TestData.ROLE_IDS.owner);
    const theo = await api.data.person('theo@acme.test', 'Theo');
    await api.data.member(acme, theo, TestData.ROLE_IDS.technician);

    const elsewhere = await api.call('GET', `/v1/webhooks/${endpoint.id}`, {
      token: await api.issuer.signFor(mia),
    });
    const technician = await api.call('GET', '/v1/webhooks', {
      token: await api.issuer.signFor(theo),
    });

    expect(elsewhere.statusCode).toBe(404);
    expect(technician.statusCode).toBe(403);
  });

  it('removes the endpoint and its deliveries', async () => {
    const removed = await api.call('DELETE', `/v1/webhooks/${endpoint.id}`, {
      token: owner,
      version: endpoint.version,
    });
    const gone = await api.call('GET', `/v1/webhooks/${endpoint.id}`, { token: owner });
    const rows = await api.data.sql('select count(*)::int as n from webhook_deliveries');

    expect(removed.statusCode).toBe(204);
    expect(gone.statusCode).toBe(404);
    expect(rows.rows[0].n).toBe(0);
    const audit = await api.call('GET', '/v1/audit-log?target_type=webhook', { token: owner });
    expect(audit.json().items[0].action).toBe('webhooks.deleted');
  });
});
