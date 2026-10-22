import { TestApi } from '../../../testing/test-api';
import { TestData, TestPerson } from '../../../testing/test-data';
import { TestDatabase } from '../../../testing/test-database';

/** Story AST-03 end to end: a charger's connectors, and the status derived from them. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Connectors', () => {
  const api = new TestApi();
  let acme: string;
  let chargerId: string;
  let olivia: TestPerson;
  let ownerToken: string;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    const depot = await api.data.site(acme, 'Depot North');
    chargerId = await api.data.charger(acme, depot, 'SN-AB129934');
    olivia = await api.data.person('olivia@acme.test', 'Olivia Owner');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    ownerToken = await api.issuer.signFor(olivia);
  });

  afterAll(async () => api.stop());

  const asOwner = () => ({ token: ownerToken });

  it('adds, edits and removes connectors with sensible defaults', async () => {
    const charger = { id: chargerId };
    const url = `/v1/chargers/${charger.id}/connectors`;

    const a = await api.call('POST', url, {
      ...asOwner(),
      body: { type: 'type2', max_power_kw: 22 },
    });
    expect(a.statusCode).toBe(201);
    expect(a.json()).toMatchObject({
      ocpp_connector_id: 1,
      label: 'A',
      type: 'type2',
      status: 'unknown',
    });

    const b = await api.call('POST', url, { ...asOwner(), body: {} });
    expect(b.json()).toMatchObject({ ocpp_connector_id: 2, label: 'B', type: 'unknown' });

    const duplicate = await api.call('POST', url, { ...asOwner(), body: { ocpp_connector_id: 2 } });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ code: 'connector_number_taken' });

    const edited = await api.call('PATCH', `/v1/connectors/${b.json().id}`, {
      ...asOwner(),
      version: 1,
      body: { label: 'Right', current_type: 'ac' },
    });
    expect(edited.json()).toMatchObject({ label: 'Right', current_type: 'ac', version: 2 });

    const detail = await api.call('GET', `/v1/chargers/${charger.id}`, asOwner());
    expect(detail.json().connectors.map((c: { label: string }) => c.label)).toEqual(['A', 'Right']);
    expect(detail.json().status).toBe('waiting');

    const removed = await api.call('DELETE', `/v1/connectors/${b.json().id}`, {
      ...asOwner(),
      version: 2,
    });
    expect(removed.statusCode).toBe(204);
    expect((await api.call('GET', url, asOwner())).json()).toHaveLength(1);
  });

  it('derives the status from what the charger reported', async () => {
    const charger = { id: chargerId };
    await api.data.sql(
      `update chargers set last_boot_at = now(), last_seen_at = now(), heartbeat_interval_s = 60 where id = $1`,
      [charger.id],
    );
    await api.data.sql(
      `update connectors set status = 'charging', status_changed_at = now() where charger_id = $1`,
      [charger.id],
    );
    expect((await api.call('GET', `/v1/chargers/${charger.id}`, asOwner())).json().status).toBe(
      'charging',
    );

    const connector = (
      await api.call('GET', `/v1/chargers/${charger.id}/connectors`, asOwner())
    ).json()[0];
    const reported = await api.call('DELETE', `/v1/connectors/${connector.id}`, {
      ...asOwner(),
      version: 1,
    });
    expect(reported.statusCode).toBe(409);
    expect(reported.json()).toMatchObject({ code: 'connector_reported' });

    await api.data.sql(
      `update chargers set last_seen_at = now() - interval '10 minutes' where id = $1`,
      [charger.id],
    );
    expect((await api.call('GET', `/v1/chargers/${charger.id}`, asOwner())).json().status).toBe(
      'offline',
    );
  });
});
