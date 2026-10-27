import {
  TestData,
  TestDatabase,
  TestSessions,
  TestTariffs,
  TestPerson,
} from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Sessions end to end: list within one's sites, receipt, timeline, chart, close, export. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Sessions', () => {
  const api = new TestApi();
  let acme: string;
  let ownerToken: string;
  let riverside: string;
  let stopped: string;
  let running: string;

  const placeOn = async (siteName: string, identity: string) => {
    const siteId = await api.data.site(acme, siteName);
    const chargerId = await api.data.charger(acme, siteId, identity);
    const connectorId = await api.data.connector(acme, chargerId, 1);
    return { tenantId: acme, siteId, chargerId, connectorId };
  };

  const tokenFor = async (email: string, roleId: string, siteId: string | null = null) => {
    const person: TestPerson = await api.data.person(email);
    await api.data.member(acme, person, roleId, siteId);
    return api.issuer.signFor(person);
  };

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    ownerToken = await tokenFor('olivia@acme.test', TestData.ROLE_IDS.owner);
    const river = await placeOn('Riverside', 'CP-RIVER-1');
    const depot = await placeOn('Depot North', 'CP-DEPOT-1');
    riverside = river.siteId;
    const tariff = await new TestTariffs(api.data).create(acme, 'Standard');
    const sessions = new TestSessions(api.data);
    stopped = await sessions.create(river, { tariffVersionId: tariff.versionId });
    running = await sessions.create(depot, {
      status: 'charging',
      startedAt: '2026-03-11T08:00:00Z',
      endedAt: null,
      unpluggedAt: null,
      meterStopWh: null,
      readings: [],
      history: [
        { from: null, to: 'charging', event: 'transaction_started', at: '2026-03-11T08:00:00Z' },
      ],
    });
  });

  afterAll(async () => api.stop());

  const asOwner = () => ({ token: ownerToken });

  it('lists sessions newest first, filtered by state', async () => {
    const all = await api.call('GET', '/v1/sessions', asOwner());
    expect(all.json().items.map((session: { id: string }) => session.id)).toEqual([
      running,
      stopped,
    ]);
    expect(all.json().items[1]).toMatchObject({
      status: 'stopping',
      site_name: 'Riverside',
      charger_identity: 'CP-RIVER-1',
      connector_label: 'A',
      energy_wh: 22000,
      is_priced: false,
    });

    const charging = await api.call('GET', '/v1/sessions?status=charging,idle', asOwner());
    expect(charging.json().items.map((session: { id: string }) => session.id)).toEqual([running]);

    const bad = await api.call('GET', '/v1/sessions?status=charging,flying', asOwner());
    expect(bad.statusCode).toBe(400);
  });

  it('shows a site-scoped technician only the sessions at their site', async () => {
    const token = await tokenFor('tess@acme.test', TestData.ROLE_IDS.technician, riverside);

    const list = await api.call('GET', '/v1/sessions', { token });
    expect(list.json().items.map((session: { id: string }) => session.id)).toEqual([stopped]);
    expect((await api.call('GET', `/v1/sessions/${running}`, { token })).statusCode).toBe(404);

    const close = await api.call('POST', `/v1/sessions/${stopped}/close`, { token });
    expect(close.statusCode).toBe(403);
  });

  it('closes a stopped session by pricing it now: the worked example costs 8.80', async () => {
    const closed = await api.call('POST', `/v1/sessions/${stopped}/close`, asOwner());

    expect(closed.statusCode).toBe(200);
    expect(closed.json()).toMatchObject({
      status: 'completed',
      currency: 'GBP',
      gross_amount: 880,
      tax_amount: 147,
      is_priced: true,
      tariff: { name: 'Standard', version_number: 1 },
      pricing_engine_version: '1.0.0',
    });
    expect(closed.json().lines).toMatchObject([
      { kind: 'energy', band_name: 'Off-peak', quantity: 10000, unit_price: '0.3000', gross: 300 },
      { kind: 'energy', band_name: 'Peak', quantity: 12000, unit_price: '0.4000', gross: 480 },
      { kind: 'idle', quantity: 10, unit: 'min', gross: 100 },
    ]);
    expect(closed.json().state_changes.map((change: { event: string }) => change.event)).toEqual([
      'transaction_started',
      'transaction_ended',
      'priced',
    ]);

    const again = await api.call('POST', `/v1/sessions/${stopped}/close`, asOwner());
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ code: 'session_closed' });
  });

  it('draws the energy chart from the start, the readings and the stop', async () => {
    const points = await api.call('GET', `/v1/sessions/${stopped}/meter-values`, asOwner());
    expect(points.json().map((point: { energy_wh: number }) => point.energy_wh)).toEqual([
      0, 10000, 22000,
    ]);
  });

  it('closes a running session the charger never stopped as failed, with an audit entry', async () => {
    const closed = await api.call('POST', `/v1/sessions/${running}/close`, asOwner());

    expect(closed.json()).toMatchObject({
      status: 'failed',
      failure_reason: 'closed_by_staff',
      gross_amount: null,
    });
    const audit = await api.call('GET', '/v1/audit-log?target_type=session', asOwner());
    expect(audit.json().items).toMatchObject([
      { action: 'sessions.closed', target_id: running },
      { action: 'sessions.closed', target_id: stopped },
    ]);
  });

  it('exports sessions as CSV for finance', async () => {
    const token = await tokenFor('fred@acme.test', TestData.ROLE_IDS.finance);

    const csv = await api.call('GET', '/v1/sessions/export?status=completed', { token });

    expect(csv.statusCode).toBe(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    const [header, row, extra] = csv.body.split('\r\n');
    expect(header).toBe(
      'session_id,status,site,charger,connector,id_tag,started_at,ended_at,unplugged_at,' +
        'energy_kwh,currency,net,tax,gross,review_flags,failure_reason,start_source,payment_rule',
    );
    expect(row).toContain(`${stopped},completed,Riverside,CP-RIVER-1,A,TEST-TAG,`);
    expect(row).toContain(',22.000,GBP,7.33,1.47,8.80,,');
    expect(extra).toBeUndefined();
  });
});
