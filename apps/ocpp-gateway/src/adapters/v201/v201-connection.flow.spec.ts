import { ChargerMessages, ChargerMessages201 } from '@wattwisely/charger-sim';
import { TestDatabase } from '@wattwisely/db/testing';
import { TestGateway } from '../../testing/test-gateway';

/** OCPP 2.0.1 end to end: the version picked at the upgrade, the boot, the EVSEs and the error words. */
(TestDatabase.isConfigured() ? describe : describe.skip)('OCPP 2.0.1 connections', () => {
  const gateway = new TestGateway();
  let acme: string;
  let site: string;

  beforeAll(async () => {
    await gateway.start();
    acme = await gateway.data.tenant('acme-charging');
    site = await gateway.data.site(acme, 'Riverside');
  });

  afterAll(async () => gateway.stop());

  it('speaks 2.0.1 with a station that offers it first, and records the version it booted with', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-201');
    const charger = gateway.charger('WW-201', {
      protocols: ['ocpp2.0.1', 'ocpp1.6'],
      vendor: 'Alpitronic',
      model: 'HYC50',
      serial: 'HYC-1',
    });
    await charger.connect();
    expect(charger.protocol).toBe('ocpp2.0.1');
    const messages = new ChargerMessages201(charger);

    expect(await charger.call('Heartbeat', {})).toMatchObject({ code: 'SecurityError' });
    expect(await charger.call('BootNotification', { chargePointVendor: 'x' })).toMatchObject({
      kind: 'error',
      code: 'PropertyConstraintViolation',
    });
    expect((await messages.boot()).status).toBe('Accepted');

    const row = await gateway.eventually(
      `select c.vendor, c.model, c.charge_point_serial, c.firmware_version, c.ocpp_version, n.ocpp_version as live_version
       from chargers c join charger_connections n on n.charger_id = c.id where c.id = $1 and n.is_booted`,
      [chargerId],
    );
    expect(row).toEqual({
      vendor: 'Alpitronic',
      model: 'HYC50',
      charge_point_serial: 'HYC-1',
      firmware_version: '2.0.0',
      ocpp_version: '2.0.1',
      live_version: '2.0.1',
    });
    await charger.close();
  });

  it('keeps speaking 1.6 to a 1.6 charger, and takes a station that offers nothing at its last version', async () => {
    await gateway.data.charger(acme, site, 'WW-16');
    const sixteen = gateway.charger('WW-16', { protocols: ['ocpp1.6', 'ocpp2.0.1'] });
    await sixteen.connect();
    expect(sixteen.protocol).toBe('ocpp1.6');
    expect((await new ChargerMessages(sixteen).boot()).status).toBe('Accepted');
    expect(await sixteen.call('TransactionEvent', {})).toMatchObject({ code: 'NotImplemented' });
    await sixteen.close();

    await gateway.data.charger(acme, site, 'WW-SILENT', { ocppVersion: '2.0.1' });
    const silent = gateway.charger('WW-SILENT', { protocols: [] });
    await silent.connect();
    expect((await new ChargerMessages201(silent).boot()).status).toBe('Accepted');
    await silent.close();

    await gateway.data.charger(acme, site, 'WW-FUTURE');
    const future = gateway.charger('WW-FUTURE', { protocols: ['ocpp2.1'] });
    await expect(future.connect()).rejects.toMatchObject({
      status: 400,
      reason: 'unsupported_protocol',
    });
  });

  it('answers 2.0.1 messages the platform has no use for, and spells its errors the 2.0.1 way', async () => {
    await gateway.data.charger(acme, site, 'WW-WORDS');
    const charger = gateway.charger('WW-WORDS', { protocols: ChargerMessages201.PROTOCOLS });
    await charger.connect();
    const messages = new ChargerMessages201(charger);
    await messages.boot();

    expect(await messages.securityEvent('SettingSystemTime')).toEqual({});
    expect(await charger.call('StartTransaction', { connectorId: 1 })).toMatchObject({
      code: 'NotImplemented',
    });
    expect(
      await charger.call('StatusNotification', {
        timestamp: new Date().toISOString(),
        connectorStatus: 'Occupied',
        evseId: 'one',
        connectorId: 1,
      }),
    ).toMatchObject({ code: 'TypeConstraintViolation', details: { field: 'evseId' } });

    expect(await charger.sendRawForReply('bad-1', '[2, "bad-1", "Heartbeat"]')).toMatchObject({
      kind: 'error',
      code: 'FormatViolation',
    });
    await charger.close();
  });

  it('creates the EVSE a StatusNotification names as a connector, and marks it when the car leaves', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-EVSE');
    const charger = gateway.charger('WW-EVSE', { protocols: ChargerMessages201.PROTOCOLS });
    await charger.connect();
    const messages = new ChargerMessages201(charger);
    await messages.boot();

    await messages.status(0, 'Available');
    await messages.status(2, 'Occupied');
    const event = await gateway.events.next(
      (candidate) =>
        candidate.type === 'connector.status' && candidate.data['ocpp_connector_id'] === 2,
    );
    expect(event.data).toMatchObject({ status: 'occupied' });
    const { rows } = await gateway.data.sql(
      'select ocpp_connector_id, evse_id, label, status from connectors where charger_id = $1 order by ocpp_connector_id',
      [chargerId],
    );
    expect(rows).toEqual([{ ocpp_connector_id: 2, evse_id: 2, label: 'A', status: 'occupied' }]);

    await messages.status(2, 'Faulted');
    await gateway.eventually(
      `select 1 from connectors where charger_id = $1 and ocpp_connector_id = 2 and status = 'faulted'`,
      [chargerId],
    );
    await charger.close();
  });
});
