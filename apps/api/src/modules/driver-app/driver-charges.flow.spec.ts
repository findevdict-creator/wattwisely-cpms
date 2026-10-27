import { TestDatabase } from '@wattwisely/db/testing';
import { DriverChargesFixture } from './driver-charges.fixture';

/**
 * Module 19 part 2: a driver charges from the app. Who pays is decided by the operator's
 * levels; a paid start holds the saved card with no card form; a free start sends
 * RemoteStart at once; a login the operator does not know gets a guest record with consent.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Driver charges', () => {
  const stage = new DriverChargesFixture();
  const { api } = stage;
  let danaSessionId = '';
  let guySessionId = '';

  beforeAll(async () => {
    await stage.start();
    await stage.saveCard(stage.danaToken);
  });
  afterAll(() => stage.stop());

  it('holds the member hold on the saved card and sends RemoteStart, with no card form', async () => {
    const place = await stage.place(stage.danaToken);
    expect(place.json()).toMatchObject({
      charger_identity: 'CP-DRV-1',
      availability: 'available',
      access: {
        is_linked: true,
        is_guest_record: false,
        needs_consent: false,
        payment: { outcome: 'pay', decided_by: 'operator', hold_amount: 5000 },
        card: { brand: 'visa', last4: '4242' },
        can_charge: true,
        reason: null,
      },
    });

    const account = await api.call('GET', '/v1/payment-account', { token: stage.owner });
    const hold = await api.call('PATCH', '/v1/payment-account', {
      token: stage.owner,
      version: account.json().version,
      body: { member_hold_amount: 2000 },
    });
    expect(hold.json()).toMatchObject({ hold_amount: 5000, member_hold_amount: 2000 });

    const start = await stage.startCharge(stage.danaToken, 1);
    danaSessionId = start.json().id;
    expect(start.statusCode).toBe(201);
    expect(start.json()).toMatchObject({
      operator_name: 'acme charging',
      status: 'starting',
      is_paid: true,
      start_source: 'account',
      payment_rule: {
        outcome: 'pay',
        decided_by: 'operator',
        words: "Paid: the operator's standard",
      },
      payment: { status: 'authorised', hold_amount: 2000, card_last4: '4242' },
      can_stop: false,
    });
    expect(start.json().charge_key).toMatch(/\w/);
    expect(await stage.commandsFor(danaSessionId)).toEqual(['remote_start']);
    expect(api.gateway.calls.filter((call) => call.startsWith('createSavedCardHold'))).toEqual([
      `createSavedCardHold:2000:hold:${danaSessionId}`,
    ]);
    expect((await stage.startCharge(stage.danaToken, 1)).json().code).toBe('plug_unavailable');
  });

  it('starts a free session at once when a group says free', async () => {
    const group = await api.call('POST', '/v1/access-groups', {
      token: stage.owner,
      body: { name: 'Depot staff', payment_mode: 'free', driver_ids: [stage.danaDriverId] },
    });
    expect(group.statusCode).toBe(201);

    const place = await stage.place(stage.danaToken, 2);
    expect(place.json().access.payment).toMatchObject({
      outcome: 'free',
      decided_by: 'group',
      label: 'Depot staff',
      hold_amount: null,
    });
    const start = await stage.startCharge(stage.danaToken, 2);
    expect(start.statusCode).toBe(201);
    expect(start.json()).toMatchObject({
      status: 'starting',
      is_paid: false,
      payment: null,
      payment_rule: { outcome: 'free', decided_by: 'group', label: 'Depot staff' },
    });
    expect(await stage.commandsFor(start.json().id)).toEqual(['remote_start']);
    await api.call('DELETE', `/v1/access-groups/${group.json().id}`, { token: stage.owner });
  });

  it('asks a login the operator does not know for consent, then keeps a guest record', async () => {
    const noCard = await stage.place(stage.guyToken, 3);
    expect(noCard.json().access).toMatchObject({
      is_linked: false,
      needs_consent: true,
      payment: { outcome: 'pay', decided_by: 'guest', hold_amount: 5000 },
      card: null,
      can_charge: false,
      reason: 'no_payment_method',
    });
    await stage.saveCard(stage.guyToken);
    expect((await stage.place(stage.guyToken, 3)).json().access.can_charge).toBe(true);
    expect((await stage.startCharge(stage.guyToken, 3)).json().code).toBe('consent_required');

    const start = await stage.startCharge(stage.guyToken, 3, true);
    expect(start.statusCode).toBe(201);
    expect(start.json()).toMatchObject({
      status: 'starting',
      payment_rule: { outcome: 'pay', decided_by: 'operator' },
      payment: { status: 'authorised', hold_amount: 5000 },
    });
    guySessionId = start.json().id;
    const record = await api.data.sql(
      `select name, email, is_guest, driver_account_id is not null as is_linked from drivers where email = $1`,
      ['guy@example.com'],
    );
    expect(record.rows[0]).toEqual({
      name: 'Guy Guest',
      email: 'guy@example.com',
      is_guest: true,
      is_linked: true,
    });
    const audit = await api.data.sql(
      `select action, actor_type from audit_log where action = 'drivers.guest_record_created'`,
    );
    expect(audit.rows).toEqual([{ action: 'drivers.guest_record_created', actor_type: 'driver' }]);
    expect((await stage.place(stage.guyToken, 3)).json().access).toMatchObject({
      is_linked: true,
      is_guest_record: true,
      needs_consent: false,
    });
  });

  it('ends a start as not started when the bank refuses the saved card', async () => {
    for (const setup of api.gateway.savedCards.setups.values()) {
      if (setup.card) {
        api.gateway.savedCards.refusedCards.add(setup.card.providerPaymentMethodId);
      }
    }

    await stage.running(guySessionId, 7);
    const stopped = await api.call('POST', `/v1/driver/charges/${guySessionId}/stop`, {
      token: stage.guyToken,
    });
    expect(stopped.json()).toMatchObject({ status: 'charging', is_stop_requested: true });
    await api.data.sql(
      `update charging_sessions set status = 'completed', ended_at = now() where id = $1`,
      [guySessionId],
    );

    const refused = await stage.startCharge(stage.guyToken, 3);
    expect(refused.statusCode).toBe(201);
    expect(refused.json()).toMatchObject({
      status: 'not_started',
      failure_reason: 'declined',
      payment: { status: 'failed', failure_message: 'Your card was declined.' },
    });
    api.gateway.savedCards.refusedCards.clear();
  });

  it('lists, exports and shows only the driver’s own charges, and stops a running one', async () => {
    const list = await api.call('GET', '/v1/driver/charges', { token: stage.danaToken });
    expect(list.json().items.map((item: { id: string }) => item.id)).toContain(danaSessionId);
    expect(list.json().items.map((item: { id: string }) => item.id)).not.toContain(guySessionId);
    expect(list.json().items[0]).toMatchObject({ operator_name: 'acme charging' });

    const csv = await api.call('GET', '/v1/driver/charges/export', { token: stage.danaToken });
    expect(csv.headers['content-type']).toContain('text/csv');
    expect(csv.body.split('\r\n')[0]).toBe(
      'started_at,ended_at,operator,site,charger,connector,status,energy_kwh,currency,amount,payment_rule,payment_status,card',
    );
    expect(csv.body).toContain("Paid: the operator's standard,authorised,visa 4242");

    const theirs = await api.call('GET', `/v1/driver/charges/${guySessionId}`, {
      token: stage.danaToken,
    });
    expect(theirs.statusCode).toBe(404);
    const notRunning = await api.call('POST', `/v1/driver/charges/${danaSessionId}/stop`, {
      token: stage.danaToken,
    });
    expect(notRunning.json().code).toBe('charge_not_running');

    await stage.running(danaSessionId, 8);
    const stop = await api.call('POST', `/v1/driver/charges/${danaSessionId}/stop`, {
      token: stage.danaToken,
    });
    expect(stop.json()).toMatchObject({ can_stop: true, is_stop_requested: true });
    expect(await stage.commandsFor(danaSessionId)).toEqual(['remote_start', 'remote_stop']);
    const again = await api.call('POST', `/v1/driver/charges/${danaSessionId}/stop`, {
      token: stage.danaToken,
    });
    expect(await stage.commandsFor(danaSessionId)).toEqual(['remote_start', 'remote_stop']);
    expect(again.statusCode).toBe(200);
  });
});
