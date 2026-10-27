import { TestDatabase } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';
import { ChatNotifyJob } from './chat-notify.job';
import { MessagingSendJob } from './messaging-send.job';

/** Module 17: the worker tells drivers in their chat how a linked charge goes, and sends what is queued. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Messaging jobs', () => {
  const worker = new TestWorker();
  const driver = '447700900123';
  let acme: string;
  let place: { tenantId: string; siteId: string; chargerId: string; connectorId: string };
  let channel: string;
  let conversation: string;
  let sessionId: string;
  let notify: ChatNotifyJob;
  let send: MessagingSendJob;

  beforeAll(async () => {
    await worker.start();
    notify = worker.app.get(ChatNotifyJob);
    send = worker.app.get(MessagingSendJob);
    acme = await worker.data.tenant('acme-charging');
    const siteId = await worker.data.site(acme, 'Riverside');
    const chargerId = await worker.data.charger(acme, siteId, 'WW-1');
    const connectorId = await worker.data.connector(acme, chargerId, 1);
    place = { tenantId: acme, siteId, chargerId, connectorId };
    channel = await worker.addons.messagingChannel(acme, { phoneNumberId: 'pn-1' });
    sessionId = await worker.sessions.create(place, {
      status: 'charging',
      startedAt: new Date(Date.now() - 10 * 60_000).toISOString(),
      endedAt: null,
      meterStopWh: null,
      history: [],
      readings: [],
    });
    conversation = await worker.addons.conversation(acme, channel, driver, {
      sessionId,
      chargeKey: 'key-1',
      chargerId,
      connectorId,
    });
  });

  afterAll(async () => {
    await worker.stop();
  });

  async function messages() {
    const { rows } = await worker.data.sql(
      `select direction, status, body, buttons, attempts, provider_message_id, error, next_attempt_at
       from messaging_messages where conversation_id = $1 order by created_at`,
      [conversation],
    );
    return rows;
  }

  it('tells the driver once when the charge starts', async () => {
    expect(await notify.runOnce(new Date())).toBe(1);
    expect(await notify.runOnce(new Date())).toBe(0);

    const [started] = await messages();
    expect(started).toMatchObject({ direction: 'out', status: 'pending' });
    expect(started.body).toContain('Charging has started at WW-1 plug 1');
    expect(started.buttons).toEqual([
      { id: 'stop', title: 'Stop charging' },
      { id: 'status', title: 'Status' },
    ]);
    expect(
      await worker.row('select notified_kinds from messaging_conversations where id = $1', [
        conversation,
      ]),
    ).toEqual({ notified_kinds: ['started'] });
  });

  it('sends the queued message through the channel and records the provider id', async () => {
    const now = new Date();
    expect(await send.runOnce(now)).toBe(1);
    expect(await send.runOnce(now)).toBe(0);

    expect(worker.chat.sent).toHaveLength(1);
    expect(worker.chat.sent[0]).toMatchObject({
      credentials: { phoneNumberId: 'pn-1', accessToken: '' },
      message: {
        to: driver,
        buttons: [
          { id: 'stop', title: 'Stop charging' },
          { id: 'status', title: 'Status' },
        ],
      },
    });
    const [started] = await messages();
    expect(started).toMatchObject({
      status: 'sent',
      attempts: 1,
      provider_message_id: 'wamid.fake-1',
    });
  });

  it('sends the receipt once the charge is over and priced', async () => {
    await worker.data.sql(
      `update charging_sessions set status = 'completed', ended_at = started_at + interval '42 minutes',
         energy_wh = 5600, currency = 'GBP', gross_amount = 420, priced_at = now() where id = $1`,
      [sessionId],
    );

    expect(await notify.runOnce(new Date())).toBe(1);
    expect(await notify.runOnce(new Date())).toBe(0);
    const [, finished] = await messages();
    expect(finished.body).toContain(
      'Your charge at WW-1 plug 1 has ended: 5.6 kWh in 42 min for GBP 4.20.',
    );
    expect(finished.body).toContain('http://driver.test/charges/key-1');
  });

  it('tries a failed send again after 30 seconds and two minutes, then gives up', async () => {
    worker.chat.failWith = 'rate limited';
    const now = new Date();

    expect(await send.runOnce(now)).toBe(1);
    let [, finished] = await messages();
    expect(finished).toMatchObject({ status: 'pending', attempts: 1, error: 'rate limited' });
    expect((finished.next_attempt_at as Date).getTime()).toBe(now.getTime() + 30_000);

    expect(await send.runOnce(new Date(now.getTime() + 10_000))).toBe(0);
    expect(await send.runOnce(new Date(now.getTime() + 31_000))).toBe(1);
    [, finished] = await messages();
    expect(finished).toMatchObject({ status: 'pending', attempts: 2 });
    expect((finished.next_attempt_at as Date).getTime()).toBe(now.getTime() + 31_000 + 120_000);

    expect(await send.runOnce(new Date(now.getTime() + 200_000))).toBe(1);
    [, finished] = await messages();
    expect(finished).toMatchObject({ status: 'failed', attempts: 3, error: 'rate limited' });
    worker.chat.reset();
  });

  it('leaves messages on a paused channel waiting', async () => {
    await worker.data.sql('update messaging_channels set is_active = false where id = $1', [
      channel,
    ]);
    await worker.data.sql(
      `insert into messaging_messages (id, tenant_id, conversation_id, direction, status, body)
       values (gen_random_uuid(), $1, $2, 'out', 'pending', 'later')`,
      [acme, conversation],
    );

    expect(await send.runOnce(new Date())).toBe(0);
    await worker.data.sql('update messaging_channels set is_active = true where id = $1', [
      channel,
    ]);
    expect(await send.runOnce(new Date())).toBe(1);
    expect(worker.chat.textsTo(driver)).toEqual(['later']);
  });
});
