import { TestData, TestDatabase, TestSessions } from '@wattwisely/db/testing';
import { TestChargeKeys } from '@wattwisely/payments/testing';
import { PaymentsFixture } from '../payments/payments.fixture';

/** What a QR code leads to, the stickers, stopping one's own charge, and the receipt. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Drivers', () => {
  const fixture = new PaymentsFixture();
  const { api } = fixture;
  let depotChargerId: string;

  beforeAll(async () => {
    await fixture.start();
    await fixture.connectedAccount();
    await api.data.sql(
      `insert into charger_connections (charger_id, tenant_id, instance_id, connection_id, ocpp_version, lease_expires_at)
       values ($1, $2, 'gateway-test:1', 'socket-1', '1.6', now() + interval '1 hour')`,
      [fixture.chargerId, fixture.acme],
    );
    await api.data.sql(
      `update connectors set status = 'faulted' where charger_id = $1 and ocpp_connector_id = 3`,
      [fixture.chargerId],
    );
    const depot = await api.data.site(fixture.acme, 'Depot North');
    depotChargerId = await api.data.charger(fixture.acme, depot, 'CP-PAY-2');
    await api.data.connector(fixture.acme, depotChargerId, 1);
  });
  afterAll(() => fixture.stop());

  const place = (identity: string, connector: string) =>
    api.call('GET', `/v1/public/places/${identity}/${connector}`);

  it('describes the plug a QR code names: who, where, whether it is free, and the prices', async () => {
    const answer = await place('cp-pay-1', '1');

    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toMatchObject({
      operator_name: 'acme charging',
      site_name: 'Riverside',
      address: { line1: '1 Test Street', city: 'London', postal_code: 'E1 6AN', country: 'GB' },
      time_zone: 'Europe/London',
      charger_identity: 'CP-PAY-1',
      ocpp_connector_id: 1,
      connector_label: 'A',
      max_power_kw: 22,
      is_charger_online: true,
      availability: 'available',
      is_card_payment_accepted: true,
      hold_amount: 5000,
      tariff: {
        name: 'Standard',
        currency: 'GBP',
        tax_rate: '20.00',
        is_tax_included: true,
        start_fee: 0,
        idle_grace_minutes: 15,
        idle_fee_cap: 1000,
        bands: [
          { name: 'Off-peak', start: '00:00', end: '17:00', energy_price_per_kwh: '0.3000' },
          { name: 'Peak', start: '17:00', end: '24:00', energy_price_per_kwh: '0.4000' },
        ],
      },
    });
    expect(['Off-peak', 'Peak']).toContain(answer.json().tariff.current_band);

    expect((await place('nope', '1')).json()).toMatchObject({ code: 'charger_not_found' });
    expect((await place('cp-pay-1', '9')).json()).toMatchObject({ code: 'connector_not_found' });
    expect((await place('cp-pay-1', 'x')).json()).toMatchObject({ code: 'connector_not_found' });
  });

  it('says when a plug cannot be used, and when the company cannot take a card there', async () => {
    expect((await place('cp-pay-1', '3')).json()).toMatchObject({ availability: 'faulted' });

    const depot = await place('cp-pay-2', '1');
    expect(depot.json()).toMatchObject({
      site_name: 'Depot North',
      is_charger_online: false,
      availability: 'offline',
      is_card_payment_accepted: false,
      hold_amount: 5000,
      tariff: null,
    });
  });

  it('prints one QR code per plug for staff who may see the charger', async () => {
    const codes = await api.call(
      'GET',
      `/v1/chargers/${fixture.chargerId}/qr-codes`,
      fixture.asOwner(),
    );

    expect(codes.statusCode).toBe(200);
    expect(codes.json()).toHaveLength(3);
    expect(codes.json()[0]).toMatchObject({
      ocpp_connector_id: 1,
      label: 'A',
      url: 'http://charge.test/c/CP-PAY-1/1',
    });
    expect(codes.json()[0].svg).toMatch(/^<svg /);
    expect(codes.json()[2].url).toBe('http://charge.test/c/CP-PAY-1/3');

    const depot = await api.data.site(fixture.acme, 'Depot South');
    const token = await fixture.tokenFor('tess@acme.test', TestData.ROLE_IDS.technician, depot);
    const outside = await api.call('GET', `/v1/chargers/${fixture.chargerId}/qr-codes`, { token });
    expect(outside.statusCode).toBe(404);
    expect((await api.call('GET', `/v1/chargers/${fixture.chargerId}/qr-codes`)).statusCode).toBe(
      401,
    );
  });

  it('lets the driver stop a running charge, once', async () => {
    const start = await fixture.startCharge(1);
    const key = start.json().charge_key;
    const sessionId = start.json().session_id;
    expect(start.json()).toMatchObject({ operator_name: 'acme charging', site_name: 'Riverside' });
    expect((await place('cp-pay-1', '1')).json()).toMatchObject({ availability: 'busy' });

    const tooEarly = await api.call('POST', `/v1/public/charges/${key}/stop`);
    expect(tooEarly.statusCode).toBe(409);
    expect(tooEarly.json()).toMatchObject({ code: 'charge_not_running' });

    api.gateway.confirm([...api.gateway.holds.keys()].at(-1) as string);
    await api.call('POST', `/v1/public/charges/${key}/check`);
    await api.data.sql(
      `update charging_sessions set status = 'charging', ocpp_transaction_id = nextval('ocpp_transaction_id_seq'),
         meter_start_wh = 0 where id = $1`,
      [sessionId],
    );
    const running = await api.call('GET', `/v1/public/charges/${key}`);
    expect(running.json()).toMatchObject({
      session_status: 'charging',
      can_stop: true,
      is_stop_requested: false,
      receipt: null,
    });

    const stopped = await api.call('POST', `/v1/public/charges/${key}/stop`);
    expect(stopped.statusCode).toBe(200);
    expect(stopped.json()).toMatchObject({ can_stop: true, is_stop_requested: true });
    expect((await api.call('POST', `/v1/public/charges/${key}/stop`)).statusCode).toBe(200);

    const { rows } = await api.data.sql(
      `select c.payload->>'ocpp_transaction_id' as transaction_id, c.status, s.ocpp_transaction_id::text as expected
       from charger_commands c join charging_sessions s on s.id = (c.payload->>'session_id')::uuid
       where c.action = 'remote_stop'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ status: 'queued' });
    expect(rows[0]['transaction_id']).toBe(rows[0]['expected']);
    expect((await api.call('POST', '/v1/public/charges/not-a-key/stop')).statusCode).toBe(404);
  });

  it('shows the receipt once the session has its final price', async () => {
    const connectorId = (
      await api.data.sql(
        'select id from connectors where charger_id = $1 and ocpp_connector_id = 2',
        [fixture.chargerId],
      )
    ).rows[0]['id'] as string;
    const versionId = (await api.data.sql('select id from tariff_versions limit 1')).rows[0][
      'id'
    ] as string;
    const sessionId = await new TestSessions(api.data).create(
      {
        tenantId: fixture.acme,
        siteId: fixture.riverside,
        chargerId: fixture.chargerId,
        connectorId,
      },
      { tariffVersionId: versionId, status: 'completed' },
    );
    await api.data.sql(
      `update charging_sessions set priced_at = now(), closed_at = now(), net_amount = 733, tax_amount = 147,
         gross_amount = 880, energy_wh = 22000 where id = $1`,
      [sessionId],
    );
    await api.data.sql(
      `insert into session_line_items (id, tenant_id, session_id, position, kind, band_name, from_at, to_at,
         quantity, unit, unit_price, net, tax, gross)
       values (gen_random_uuid(), $1, $2, 1, 'energy', 'Off-peak', '2026-03-10T16:30:00Z', '2026-03-10T17:30:00Z',
         22000, 'wh', 4000, 733, 147, 880)`,
      [fixture.acme, sessionId],
    );
    const paymentId = await api.payments.payment(fixture.acme, sessionId, {
      status: 'captured',
      capturedAmount: 880,
      accessKey: TestChargeKeys.accessKey(),
    });

    const charge = await api.call(
      'GET',
      `/v1/public/charges/${TestChargeKeys.keyFor(fixture.acme, paymentId)}`,
    );

    expect(charge.statusCode).toBe(200);
    expect(charge.json()).toMatchObject({
      session_status: 'completed',
      payment_status: 'captured',
      amount: 880,
      energy_wh: 22000,
      ended_at: '2026-03-10T17:30:00.000Z',
      can_stop: false,
      client_secret: null,
      receipt: {
        net: 733,
        tax: 147,
        gross: 880,
        lines: [
          {
            kind: 'energy',
            band_name: 'Off-peak',
            quantity: 22000,
            unit_price: '0.4000',
            gross: 880,
          },
        ],
      },
    });
  });
});
