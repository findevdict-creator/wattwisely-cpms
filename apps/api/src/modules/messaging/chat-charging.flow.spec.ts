import { TestData, TestDatabase, TestPlatform } from '@wattwisely/db/testing';
import { ChatFixture } from './chat.fixture';

/** Module 17: what drivers get back when they write to the channel, and charging from the chat. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Chat charging', () => {
  const fixture = new ChatFixture();
  const { api } = fixture;
  const driver = ChatFixture.DRIVER;
  const deliver = (text: string, options = {}) => fixture.deliver(text, options);
  const outbound = () => fixture.outbound();
  let acme: string;
  let owner: string;
  let entitlement: string;
  let connectorId: string;
  let conversationId: string;
  let linkToken: string;

  beforeAll(async () => {
    await fixture.startOnline();
    acme = fixture.acme;
    owner = fixture.ownerToken;
    await api.platform.subscription(acme, TestPlatform.PLAN_IDS.growth);
    entitlement = await api.platform.entitlement(acme, 'messaging_charging');
    const { rows } = await api.data.sql(
      'select id from connectors where charger_id = $1 and ocpp_connector_id = 1',
      [fixture.chargerId],
    );
    connectorId = rows[0].id;
    await api.addons.messagingChannel(acme, {
      phoneNumberId: ChatFixture.PHONE_NUMBER_ID,
      displayPhoneNumber: '+44 7700 900000',
      greeting: 'Hi from Acme Charging!',
    });
  });

  afterAll(() => fixture.stop());

  it('drops a delivery with a bad signature, and greets a driver who writes for the first time', async () => {
    const forged = await deliver('hello', { secret: 'other' });
    const first = await deliver('hello');
    const same = await deliver('hello', { id: fixture.lastDeliveryId });

    expect(forged.statusCode).toBe(400);
    expect(forged.json().code).toBe('webhook_signature_invalid');
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ received: 1, replied: 1 });
    expect(same.json()).toEqual({ received: 1, replied: 0 });
    const replies = await outbound();
    expect(replies).toHaveLength(1);
    expect(replies[0].body).toMatch(/^Hi from Acme Charging!\nTo charge, scan the QR code/);
    expect(replies[0].status).toBe('pending');
  });

  it('answers a plug code with the link to pay on, carrying the chat’s token', async () => {
    const unknown = await deliver('charge CP-NOPE/1');
    const ready = await deliver('charge cp-pay-1/1');

    expect(unknown.json().replied).toBe(1);
    expect(ready.json().replied).toBe(1);
    const replies = await outbound();
    expect(replies[1].body).toMatch(/could not find that plug/);
    const conversation = await api.data.sql(
      'select id, link_token, charger_id, connector_id from messaging_conversations where contact = $1',
      [driver],
    );
    conversationId = conversation.rows[0].id;
    linkToken = conversation.rows[0].link_token;
    expect(conversation.rows[0]).toMatchObject({
      charger_id: fixture.chargerId,
      connector_id: connectorId,
    });
    expect(replies[2].body).toContain(
      `http://charge.test/c/CP-PAY-1/1?chat=${encodeURIComponent(linkToken)}`,
    );
  });

  it('ties the charge the page starts to the chat, so status and stop work from there', async () => {
    const start = await api.call('POST', '/v1/public/charges', {
      body: { charger_identity: 'CP-PAY-1', ocpp_connector_id: 1, chat_ref: linkToken },
    });
    expect(start.statusCode).toBe(201);
    const sessionId = start.json().session_id;
    const linked = await api.data.sql(
      'select session_id, charge_key from messaging_conversations where id = $1',
      [conversationId],
    );
    expect(linked.rows[0]).toEqual({ session_id: sessionId, charge_key: start.json().charge_key });

    const notYet = await deliver('status');
    await api.data.sql(
      `update charging_sessions set status = 'charging', ocpp_transaction_id = 77, energy_wh = 3200,
         started_at = now() - interval '12 minutes', currency = 'GBP', gross_amount = 150 where id = $1`,
      [sessionId],
    );
    const busy = await deliver('CP-PAY-1 1');
    const status = await deliver('status');
    const stop = await deliver('stop');
    const stopAgain = await deliver('Stop');

    expect([notYet, busy, status, stop, stopAgain].map((answer) => answer.json().replied)).toEqual([
      1, 1, 1, 1, 1,
    ]);
    const replies = await outbound();
    const texts = replies.slice(-5).map((reply) => reply.body);
    expect(texts[0]).toMatch(/^Your charge at CP-PAY-1 plug 1 is being set up/);
    expect(texts[1]).toMatch(/CP-PAY-1 plug 1 is in use right now/);
    expect(texts[2]).toBe('Charging at CP-PAY-1 plug 1: 3.2 kWh in 12 min, GBP 1.50 so far.');
    expect(replies.at(-3)?.buttons).toEqual([{ id: 'stop', title: 'Stop charging' }]);
    expect(texts[3]).toMatch(/^Stopping the charge at CP-PAY-1 plug 1/);
    expect(texts[4]).toMatch(/^Stopping the charge/);
    const stops = await api.data.sql(
      `select status from charger_commands where action = 'remote_stop' and payload->>'session_id' = $1`,
      [sessionId],
    );
    expect(stops.rows).toEqual([{ status: 'queued' }]);
  });

  it('lists the conversations and their messages for staff, and queues a test message', async () => {
    const test = await api.call('POST', '/v1/messaging/channel/test', {
      token: owner,
      body: { to: '+44 7700 900555' },
    });
    const list = await api.call('GET', '/v1/messaging/conversations', { token: owner });
    const messages = await api.call(
      'GET',
      `/v1/messaging/conversations/${conversationId}/messages`,
      {
        token: owner,
      },
    );

    expect(test.statusCode).toBe(202);
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(2);
    expect(list.json().find((row: { contact: string }) => row.contact === driver)).toMatchObject({
      charger_identity: 'CP-PAY-1',
      ocpp_connector_id: 1,
      session_status: 'charging',
    });
    expect(messages.json()[0]).toMatchObject({
      direction: 'in',
      status: 'received',
      body: 'hello',
    });
    expect(messages.json()[1]).toMatchObject({ direction: 'out', status: 'pending' });
    expect(messages.json().at(-1)).toMatchObject({ direction: 'out' });
    const testRows = await api.data.sql(
      `select m.body from messaging_messages m join messaging_conversations c on c.id = m.conversation_id where c.contact = '447700900555'`,
    );
    expect(testRows.rows[0].body).toMatch(/test message from acme charging on Wattwisely/);
  });

  it('ignores a paused channel, a number nobody set up, and a tenant without the add-on', async () => {
    const stranger = await deliver('hello', { phoneNumberId: '999' });
    await api.data.sql('update messaging_channels set is_active = false where tenant_id = $1', [
      acme,
    ]);
    const paused = await deliver('hello');
    await api.data.sql('update messaging_channels set is_active = true where tenant_id = $1', [
      acme,
    ]);
    await api.data.sql('delete from tenant_entitlements where id = $1', [entitlement]);
    const unentitled = await deliver('hello');
    const sam = await api.data.person('sam@acme.test', 'Sam');
    await api.data.member(acme, sam, TestData.ROLE_IDS.owner);
    const locked = await api.call('GET', '/v1/messaging/channel', {
      token: await api.issuer.signFor(sam),
    });

    expect(stranger.json()).toEqual({ received: 1, replied: 0 });
    expect(paused.json()).toEqual({ received: 1, replied: 0 });
    expect(unentitled.json()).toEqual({ received: 1, replied: 0 });
    expect(locked.statusCode).toBe(403);
    expect(locked.json().code).toBe('module_not_in_plan');
  });
});
