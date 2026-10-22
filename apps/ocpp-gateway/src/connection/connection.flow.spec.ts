import { ChargerMessages, ConnectRefused } from '@wattwisely/charger-sim';
import { TestDatabase } from '@wattwisely/db/testing';
import { ChargerPassword } from '@wattwisely/ocpp-contracts';
import { TestGateway } from '../testing/test-gateway';
import { ConnectionRegistry } from './connection-registry';
import { HeartbeatWatcher } from './heartbeat-watcher';

/** The connection lifecycle end to end: the upgrade checks, boots, duplicates, reconnects and silence. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Charger connections', () => {
  const gateway = new TestGateway();
  const password = ChargerPassword.generate();
  let acme: string;
  let site: string;

  beforeAll(async () => {
    await gateway.start();
    acme = await gateway.data.tenant('acme-charging');
    site = await gateway.data.site(acme, 'Riverside');
  });

  afterAll(async () => gateway.stop());

  it('refuses an identity nobody registered with 404', async () => {
    const charger = gateway.charger('WW-NOBODY');
    await expect(charger.connect()).rejects.toMatchObject({
      status: 404,
      reason: 'unknown_charger',
    });
  });

  it('refuses the wrong subprotocol with 400', async () => {
    await gateway.data.charger(acme, site, 'WW-PROTO');
    const charger = gateway.charger('WW-PROTO', { protocols: ['ocpp2.0.1'] });
    await expect(charger.connect()).rejects.toMatchObject({
      status: 400,
      reason: 'unsupported_protocol',
    });
  });

  it('checks the password of a charger that has one, then accepts its boot', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-SECURE', {
      passwordHash: ChargerPassword.hash(password),
    });
    const wrong = gateway.charger('WW-SECURE', { password: 'nope' });
    await expect(wrong.connect()).rejects.toMatchObject({ status: 401, reason: 'bad_credentials' });
    const none = gateway.charger('WW-SECURE');
    await expect(none.connect()).rejects.toBeInstanceOf(ConnectRefused);

    const charger = gateway.charger('ww-secure', { password, vendor: 'Alfen', model: 'Eve' });
    await charger.connect();
    const boot = await new ChargerMessages(charger).boot();
    expect(boot).toMatchObject({ status: 'Accepted', interval: 10 });

    const row = await gateway.eventually(
      `select c.vendor, c.model, c.registration_status, c.ocpp_version, n.is_booted, n.instance_id
       from chargers c join charger_connections n on n.charger_id = c.id
       where c.id = $1 and n.is_booted`,
      [chargerId],
    );
    expect(row).toMatchObject({
      vendor: 'Alfen',
      model: 'Eve',
      registration_status: 'accepted',
      ocpp_version: '1.6',
      instance_id: 'test-gateway',
    });
    expect(await gateway.events.next((event) => event.type === 'charger.booted')).toMatchObject({
      charger_id: chargerId,
      tenant_id: acme,
      data: { status: 'accepted' },
    });
    await charger.close();
    await gateway.eventually(
      'select 1 from chargers where id = $1 and not exists (select 1 from charger_connections where charger_id = $1)',
      [chargerId],
    );
  });

  it('refuses a second live socket for the same charger with 409', async () => {
    await gateway.data.charger(acme, site, 'WW-TWICE');
    const first = gateway.charger('WW-TWICE');
    await first.connect();
    const second = gateway.charger('WW-TWICE');
    await expect(second.connect()).rejects.toMatchObject({
      status: 409,
      reason: 'already_connected',
    });
    await first.close();
  });

  it('remembers a password-less charger by its first boot and rejects an impostor', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-OPEN');
    const genuine = gateway.charger('WW-OPEN', { vendor: 'EVBox', model: 'Elvi', serial: 'SN-1' });
    await genuine.connect();
    expect((await new ChargerMessages(genuine).boot()).status).toBe('Accepted');
    await genuine.close();

    const impostor = gateway.charger('WW-OPEN', { vendor: 'EVBox', model: 'Elvi', serial: 'SN-2' });
    await impostor.connect();
    expect((await new ChargerMessages(impostor).boot()).status).toBe('Rejected');
    expect(await impostor.closed()).toBe(1008);

    const stored = await gateway.row('select boot_fingerprint from chargers where id = $1', [
      chargerId,
    ]);
    expect(stored?.['boot_fingerprint']).toEqual({
      vendor: 'EVBox',
      model: 'Elvi',
      serial: 'SN-1',
    });
    const { rows } = await gateway.data.sql(
      'select response_status, reason from charger_boot_events where charger_id = $1 order by created_at',
      [chargerId],
    );
    expect(rows).toEqual([
      { response_status: 'accepted', reason: null },
      { response_status: 'rejected', reason: 'fingerprint_mismatch' },
    ]);

    const again = gateway.charger('WW-OPEN', {
      vendor: 'EVBox',
      model: 'Elvi',
      serial: 'SN-1',
      firmwareVersion: '2.0',
    });
    await again.connect();
    expect((await new ChargerMessages(again).boot()).status).toBe('Accepted');
    await again.close();
  });

  it('lets an accepted charger that lost its network carry on without booting again', async () => {
    await gateway.data.charger(acme, site, 'WW-FLAKY');
    const before = gateway.charger('WW-FLAKY');
    await before.connect();
    await new ChargerMessages(before).boot();
    await before.close();

    const after = gateway.charger('WW-FLAKY');
    await after.connect();
    const reply = await after.call('Heartbeat', {});
    expect(reply.kind).toBe('result');
    await after.close();
  });

  it('closes a silent charger, drops its lease and marks its connectors unavailable after the grace period', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-QUIET');
    const charger = gateway.charger('WW-QUIET');
    await charger.connect();
    const messages = new ChargerMessages(charger);
    await messages.boot();
    await messages.status(1, 'Available');

    const registry = gateway.app.get(ConnectionRegistry);
    const connection = registry.find(chargerId);
    expect(connection).not.toBeNull();
    (connection as NonNullable<typeof connection>).heartbeatIntervalS = 0;
    gateway.app.get(HeartbeatWatcher).sweep(Date.now() + 1);

    expect(await charger.closed()).toBe(1001);
    await gateway.events.next(
      (event) => event.type === 'charger.disconnected' && event.charger_id === chargerId,
    );
    await gateway.eventually(
      `select 1 from connectors where charger_id = $1 and status = 'unavailable'`,
      [chargerId],
    );
    expect(
      await gateway.row('select 1 from charger_connections where charger_id = $1', [chargerId]),
    ).toBeNull();
  });
});
