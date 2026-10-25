import { TestDatabase, TestDrivers, TestSavedCards } from '@wattwisely/db/testing';
import { PaymentJobsFixture } from './payment-jobs.fixture';
import { SavedCardHoldJob } from './saved-card-hold.job';

/**
 * Module 19: a paid RFID start is already charging when the gateway records it, so the
 * worker takes the hold from the holder's saved card afterwards. A refused hold, or no
 * card at all, stops the charge at once and tells the driver by e-mail.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Saved card hold job', () => {
  const fixture = new PaymentJobsFixture();
  const { ago } = PaymentJobsFixture;
  let drivers: TestDrivers;
  let saved: TestSavedCards;

  beforeAll(async () => {
    await fixture.start();
    drivers = new TestDrivers(fixture.worker.data);
    saved = new TestSavedCards(fixture.worker.data);
  });
  afterAll(() => fixture.stop());

  /** A driver with a card and a linked login, and a paid session that card started. */
  const cardStart = async (email: string, withCard: boolean) => {
    const driverId = await drivers.driver(fixture.tenantId, email, { email });
    const cardId = await drivers.card(fixture.tenantId, driverId, email.toUpperCase());
    const login = await saved.login(email);
    await saved.link(driverId, login);
    const providerCardId = withCard ? await saved.card(login) : null;
    const sessionId = await fixture.worker.sessions.create(fixture.place, {
      status: 'charging',
      tariffVersionId: fixture.versionId,
      startedAt: ago(1),
      endedAt: null,
      unpluggedAt: null,
      meterStopWh: null,
      readings: [],
      history: [{ from: null, to: 'charging', event: 'transaction_started', at: ago(1) }],
      lastEventAt: ago(1),
    });
    await fixture.worker.data.sql(
      `update charging_sessions set is_paid = true, start_source = 'rfid_card', driver_id = $2,
         rfid_card_id = $3, payment_rule = '{"outcome":"pay","decided_by":"operator","label":null}'
       where id = $1`,
      [sessionId, driverId, cardId],
    );
    return { sessionId, providerCardId };
  };

  const run = () => fixture.worker.app.get(SavedCardHoldJob).runOnce(new Date());

  const stopsFor = async (sessionId: string) => {
    const { rows } = await fixture.worker.data.sql(
      `select action from charger_commands where payload->>'session_id' = $1::text`,
      [sessionId],
    );
    return rows.map((row) => row['action']);
  };

  it('holds the member hold on the saved card, once', async () => {
    const { sessionId } = await cardStart('pat@example.com', true);

    expect(await run()).toBe(1);
    expect(await run()).toBe(0);
    const payment = await fixture.worker.row(
      `select status, hold_amount::int, card_last4, payment_method_id is not null as has_card
       from payments where session_id = $1`,
      [sessionId],
    );
    expect(payment).toEqual({
      status: 'authorised',
      hold_amount: 5000,
      card_last4: '4242',
      has_card: true,
    });
    expect(await stopsFor(sessionId)).toEqual([]);
  });

  it('stops the charge and e-mails the driver when the bank refuses', async () => {
    const { sessionId, providerCardId } = await cardStart('rex@example.com', true);
    fixture.worker.gateway.savedCards.refusedCards.add(providerCardId as string);

    expect(await run()).toBe(1);
    const payment = await fixture.worker.row(
      'select status, failure_message from payments where session_id = $1',
      [sessionId],
    );
    expect(payment).toEqual({ status: 'failed', failure_message: 'Your card was declined.' });
    expect(await stopsFor(sessionId)).toEqual(['remote_stop']);
    const session = await fixture.worker.row(
      'select review_flags from charging_sessions where id = $1',
      [sessionId],
    );
    expect(session?.['review_flags']).toContain('hold_refused');
    const mail = await fixture.worker.row(
      'select kind, to_address from notifications where session_id = $1',
      [sessionId],
    );
    expect(mail).toEqual({ kind: 'session_hold_refused', to_address: 'rex@example.com' });
  });

  it('stops the charge when the holder has removed every card since the tap', async () => {
    const { sessionId } = await cardStart('noa@example.com', false);

    expect(await run()).toBe(1);
    const payment = await fixture.worker.row(
      'select status, failure_code, failure_message from payments where session_id = $1',
      [sessionId],
    );
    expect(payment).toEqual({
      status: 'failed',
      failure_code: 'no_payment_method',
      failure_message: 'The driver has no saved card to pay with.',
    });
    expect(await stopsFor(sessionId)).toEqual(['remote_stop']);
  });
});
