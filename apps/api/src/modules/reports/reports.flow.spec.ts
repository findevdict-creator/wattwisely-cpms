import { gzipSync } from 'node:zlib';
import {
  TestData,
  TestDatabase,
  TestPerson,
  TestPlatform,
  TestSessions,
} from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** PRD Reports and story SES-04: usage on screen and as CSV, background exports, schedules. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Reports', () => {
  const api = new TestApi();
  let acme: string;
  let owner: string;
  let technician: string;
  let riverside: string;
  const march = 'from=2026-03-01T00:00:00Z&to=2026-04-01T00:00:00Z';

  const tokenFor = async (email: string, roleId: string, siteId: string | null = null) => {
    const person: TestPerson = await api.data.person(email);
    await api.data.member(acme, person, roleId, siteId);
    return api.issuer.signFor(person);
  };

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    owner = await tokenFor('olivia@acme.test', TestData.ROLE_IDS.owner);
    riverside = await api.data.site(acme, 'Riverside');
    technician = await tokenFor('tom@acme.test', TestData.ROLE_IDS.technician, riverside);
    const charger = await api.data.charger(acme, riverside, 'CP-1');
    const connectorId = await api.data.connector(acme, charger, 1);
    const place = { tenantId: acme, siteId: riverside, chargerId: charger, connectorId };
    const id = await new TestSessions(api.data).create(place, { status: 'completed' });
    await api.data.sql(
      "update charging_sessions set currency = 'GBP', gross_amount = 880, closed_at = ended_at where id = $1",
      [id],
    );
  });

  afterAll(async () => api.stop());

  it('reports sessions, energy, revenue, utilisation and uptime by site', async () => {
    const response = await api.call('GET', `/v1/reports/usage?${march}`, { token: owner });

    expect(response.statusCode).toBe(200);
    expect(response.json().rows).toEqual([
      expect.objectContaining({
        name: 'Riverside',
        chargers: 1,
        connectors: 1,
        sessions: 1,
        energy_wh: 22000,
        revenue: [{ currency: 'GBP', amount: 880 }],
        // Plugged in from 16:30 to 17:55: 85 minutes.
        occupied_seconds: 5100,
        uptime_percent: 100,
      }),
    ]);
    expect(response.json().totals.utilisation_percent).toBe(0.2);
  });

  it('downloads the same report as CSV and refuses a period over a year', async () => {
    const csv = await api.call('GET', `/v1/reports/usage/export?${march}&group_by=charger`, {
      token: owner,
    });
    const tooLong = await api.call(
      'GET',
      '/v1/reports/usage?from=2025-01-01T00:00:00Z&to=2026-04-01T00:00:00Z',
      { token: owner },
    );

    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.body.split('\r\n')[0]).toBe(
      'name,site,chargers,connectors,sessions,energy_kwh,revenue_GBP,utilisation_percent,uptime_percent,offline_hours',
    );
    expect(csv.body.split('\r\n')[2]).toMatch(/^Total,,1,1,1,22\.000,8\.80,/);
    expect(tooLong.statusCode).toBe(400);
    expect(
      (await api.call('GET', `/v1/reports/usage?${march}`, { token: technician })).statusCode,
    ).toBe(403);
  });

  it('gives the home page its numbers', async () => {
    const response = await api.call('GET', '/v1/reports/overview', { token: owner });

    expect(response.json()).toMatchObject({
      chargers: 1,
      chargers_online: 0,
      sessions_active: 0,
      alerts_open: 0,
    });
  });

  it('queues a background export and downloads it once the worker built it', async () => {
    const created = await api.call('POST', '/v1/reports/exports', {
      token: owner,
      body: { kind: 'sessions', from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
    });
    const id = created.json().id;
    const early = await api.call('GET', `/v1/reports/exports/${id}/download`, { token: owner });
    await api.data.sql(
      "update report_exports set status = 'ready', data = $2, row_count = 1 where id = $1",
      [id, gzipSync(Buffer.from('session_id\r\nabc'))],
    );
    const file = await api.call('GET', `/v1/reports/exports/${id}/download`, { token: owner });
    const list = await api.call('GET', '/v1/reports/exports', { token: owner });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      kind: 'sessions',
      status: 'queued',
      file_name: 'sessions-2026-03-01-to-2026-04-01.csv',
    });
    expect(
      (await api.data.sql('select parameters from report_exports where id = $1', [id])).rows[0]
        .parameters,
    ).toMatchObject({ siteIds: null, from: '2026-03-01T00:00:00Z' });
    expect(early.statusCode).toBe(409);
    expect(file.headers['content-disposition']).toBe(
      'attachment; filename="sessions-2026-03-01-to-2026-04-01.csv"',
    );
    expect(file.body).toBe('session_id\r\nabc');
    expect(list.json().items[0]).toMatchObject({ id, status: 'ready', row_count: 1 });
    expect(
      (await api.call('GET', `/v1/reports/exports/${id}/download`, { token: technician }))
        .statusCode,
    ).toBe(404);
  });

  it('checks the permission of the kind of file, and caps the waiting exports', async () => {
    const sessions = await api.call('POST', '/v1/reports/exports', {
      token: technician,
      body: { kind: 'sessions' },
    });
    expect(sessions.statusCode).toBe(403);

    const queue = () =>
      api.call('POST', '/v1/reports/exports', { token: owner, body: { kind: 'audit_log' } });
    expect((await queue()).statusCode).toBe(201);
    expect((await queue()).statusCode).toBe(201);
    expect((await queue()).statusCode).toBe(201);
    expect((await queue()).json().code).toBe('too_many_exports');
  });

  it('schedules e-mailed reports only on a plan with Full reports', async () => {
    const body = {
      name: 'Weekly usage',
      frequency: 'weekly',
      recipients: ['Finance@acme.test'],
      time_zone: 'Europe/London',
    };
    const locked = await api.call('POST', '/v1/reports/schedules', { token: owner, body });
    await api.platform.subscription(acme, TestPlatform.PLAN_IDS.growth);
    // The API caches access for 30 seconds; a new member is read fresh.
    const growthOwner = await tokenFor('oscar@acme.test', TestData.ROLE_IDS.owner);
    const created = await api.call('POST', '/v1/reports/schedules', { token: growthOwner, body });
    const id = created.json().id;
    const updated = await api.call('PUT', `/v1/reports/schedules/${id}`, {
      token: growthOwner,
      body: { ...body, frequency: 'monthly', is_active: false },
      version: 1,
    });
    const removed = await api.call('DELETE', `/v1/reports/schedules/${id}`, { token: growthOwner });

    expect(locked.statusCode).toBe(403);
    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      recipients: ['finance@acme.test'],
      group_by: 'site',
      is_active: true,
    });
    expect(new Date(created.json().next_run_at).getTime()).toBeGreaterThan(Date.now());
    expect(updated.json()).toMatchObject({ frequency: 'monthly', is_active: false, version: 2 });
    expect(removed.statusCode).toBe(204);
  });
});
