import { ChargerMessages, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestDatabase, TestDrivers, TestPayments, TestSavedCards } from '@wattwisely/db/testing';
import { TestGateway } from '../testing/test-gateway';

/**
 * Module 19, decision 1: no card session is free unless an operator said so. A card whose
 * session must be paid is accepted only when its holder's login has a usable saved card and
 * the operator takes payments; the session then records that it is paid and why.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('RFID card payment', () => {
  const gateway = new TestGateway();
  let acme: string;
  let drivers: TestDrivers;
  let saved: TestSavedCards;
  let chargerId: string;
  let pat: string;
  let charger: SimulatedCharger;
  let messages: ChargerMessages;

  beforeAll(async () => {
    await gateway.start();
    acme = await gateway.data.tenant('acme-charging');
    drivers = new TestDrivers(gateway.data);
    saved = new TestSavedCards(gateway.data);
    const riverside = await gateway.data.site(acme, 'Riverside');
    await gateway.data.sql("update sites set visibility = 'public' where id = $1", [riverside]);
    chargerId = await gateway.data.charger(acme, riverside, 'WW-PAY');
    pat = await drivers.driver(acme, 'Pat Payer');
    await drivers.card(acme, pat, 'PAT-0001');
    await drivers.card(acme, pat, 'PAT-FREE');
    await gateway.data.sql("update rfid_cards set payment_mode = 'free' where id_tag = 'PAT-FREE'");
    charger = gateway.charger('WW-PAY');
    messages = new ChargerMessages(charger);
    await charger.connect();
    await messages.boot();
  });

  afterAll(async () => {
    await charger?.close();
    await gateway.stop();
  });

  const statusOf = async (idTag: string) => (await messages.authorize(idTag)).idTagInfo.status;

  it('refuses a paid card until its holder has a saved card and the operator takes payments', async () => {
    expect(await statusOf('PAT-0001')).toBe('Invalid');
    expect(await statusOf('PAT-FREE')).toBe('Accepted');

    const login = await saved.login('pat@example.com');
    await saved.link(pat, login);
    await saved.card(login);
    expect(await statusOf('PAT-0001')).toBe('Invalid');

    await new TestPayments(gateway.data).account(acme);
    expect(await statusOf('PAT-0001')).toBe('Accepted');
    const used = await gateway.row<{ used: boolean }>(
      "select last_used_at is not null as used from rfid_cards where id_tag = 'PAT-0001'",
    );
    expect(used?.used).toBe(true);
  });

  it('records a paid card start, for the worker to take the hold', async () => {
    const started = await messages.startTransaction(1, 'PAT-0001', 1000);

    expect(started.idTagInfo.status).toBe('Accepted');
    const session = await gateway.eventually(
      `select is_paid, start_source, payment_rule, driver_id
       from charging_sessions where charger_id = $1 and ocpp_transaction_id = $2`,
      [chargerId, started.transactionId],
    );
    expect(session).toEqual({
      is_paid: true,
      start_source: 'rfid_card',
      payment_rule: { outcome: 'pay', decided_by: 'operator', label: null },
      driver_id: pat,
    });
  });

  it('lets a free group make the card free, and the card itself say pay again', async () => {
    await gateway.data.sql('delete from payment_methods');
    expect(await statusOf('PAT-0001')).toBe('Invalid');

    await drivers.group(acme, 'Depot staff', { driverIds: [pat] });
    await gateway.data.sql("update access_groups set payment_mode = 'free'");
    expect(await statusOf('PAT-0001')).toBe('Accepted');

    await gateway.data.sql("update rfid_cards set payment_mode = 'pay' where id_tag = 'PAT-0001'");
    expect(await statusOf('PAT-0001')).toBe('Invalid');
  });
});
