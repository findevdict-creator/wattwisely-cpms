import { ChargerMessages, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestDatabase, TestDrivers } from '@wattwisely/db/testing';
import { TestGateway } from '../testing/test-gateway';

/** Module 13: which RFID cards a charger accepts, and the driver a session is linked to. */
(TestDatabase.isConfigured() ? describe : describe.skip)('RFID card access', () => {
  const gateway = new TestGateway();
  let acme: string;
  let drivers: TestDrivers;
  let publicChargerId: string;
  let privateChargerId: string;
  let dana: string;
  let danaCard: string;
  let publicCharger: SimulatedCharger;
  let privateCharger: SimulatedCharger;
  let atPublic: ChargerMessages;
  let atPrivate: ChargerMessages;

  beforeAll(async () => {
    await gateway.start();
    acme = await gateway.data.tenant('acme-charging');
    drivers = new TestDrivers(gateway.data);
    const riverside = await gateway.data.site(acme, 'Riverside');
    const depot = await gateway.data.site(acme, 'Depot North');
    await gateway.data.sql("update sites set visibility = 'public' where id = $1", [riverside]);
    publicChargerId = await gateway.data.charger(acme, riverside, 'WW-PUBLIC');
    privateChargerId = await gateway.data.charger(acme, depot, 'WW-PRIVATE');
    dana = await drivers.driver(acme, 'Dana Driver');
    danaCard = await drivers.card(acme, dana, 'DANA-0001');
    const blocked = await drivers.driver(acme, 'Bob Blocked', { status: 'blocked' });
    await drivers.card(acme, blocked, 'BOB-0001');
    await drivers.card(acme, dana, 'DANA-LOST', { status: 'lost' });
    await drivers.card(acme, dana, 'DANA-OLD', { expiresAt: new Date('2020-01-01T00:00:00Z') });
    const other = await gateway.data.tenant('volt-hotels');
    await drivers.card(other, await drivers.driver(other, 'Vic Volt'), 'VIC-0001');
    publicCharger = gateway.charger('WW-PUBLIC');
    privateCharger = gateway.charger('WW-PRIVATE');
    atPublic = new ChargerMessages(publicCharger);
    atPrivate = new ChargerMessages(privateCharger);
    await publicCharger.connect();
    await atPublic.boot();
    await privateCharger.connect();
    await atPrivate.boot();
  });

  afterAll(async () => {
    await publicCharger?.close();
    await privateCharger?.close();
    await gateway.stop();
  });

  const statusOf = async (messages: ChargerMessages, idTag: string) =>
    (await messages.authorize(idTag)).idTagInfo.status;

  it('accepts an active card at a public site and refuses the rest', async () => {
    expect(await statusOf(atPublic, 'DANA-0001')).toBe('Accepted');
    expect(await statusOf(atPublic, 'dana-0001')).toBe('Accepted');
    expect(await statusOf(atPublic, 'NOBODY')).toBe('Invalid');
    expect(await statusOf(atPublic, 'VIC-0001')).toBe('Invalid');
    expect(await statusOf(atPublic, 'BOB-0001')).toBe('Blocked');
    expect(await statusOf(atPublic, 'DANA-LOST')).toBe('Blocked');
    expect(await statusOf(atPublic, 'DANA-OLD')).toBe('Expired');
    const card = await gateway.row<{ used: boolean }>(
      'select last_used_at is not null as used from rfid_cards where id = $1',
      [danaCard],
    );
    expect(card?.used).toBe(true);
  });

  it('admits a card at a private site only through an access group', async () => {
    expect(await statusOf(atPrivate, 'DANA-0001')).toBe('Invalid');

    const depot = (await gateway.row<{ site_id: string }>(
      'select site_id from chargers where id = $1',
      [privateChargerId],
    )) as { site_id: string };
    await drivers.group(acme, 'Depot staff', { siteIds: [depot.site_id], driverIds: [dana] });

    expect(await statusOf(atPrivate, 'DANA-0001')).toBe('Accepted');
    expect(await statusOf(atPrivate, 'BOB-0001')).toBe('Blocked');
  });

  it('links the session to the driver and the card that started it', async () => {
    const started = await atPublic.startTransaction(1, 'DANA-0001', 5000);

    expect(started.idTagInfo.status).toBe('Accepted');
    const session = await gateway.eventually(
      'select driver_id, rfid_card_id, status from charging_sessions where charger_id = $1 and ocpp_transaction_id = $2',
      [publicChargerId, started.transactionId],
    );
    expect(session).toEqual({ driver_id: dana, rfid_card_id: danaCard, status: 'charging' });
  });

  it('follows a charger whose visibility overrides its site', async () => {
    await gateway.data.sql("update chargers set visibility_override = 'private' where id = $1", [
      publicChargerId,
    ]);
    expect(await statusOf(atPublic, 'DANA-0001')).toBe('Invalid');
    await gateway.data.sql('update chargers set visibility_override = null where id = $1', [
      publicChargerId,
    ]);
  });
});
