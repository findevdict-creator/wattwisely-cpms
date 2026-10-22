import { SessionPlace, TestSessionOptions } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';

/** A tenant with a charger, a tariff and an active connected account, for the payment job tests. */
export class PaymentJobsFixture {
  readonly worker = new TestWorker();
  tenantId!: string;
  place!: SessionPlace;
  versionId!: string;
  providerAccountId!: string;

  async start(): Promise<void> {
    await this.worker.start();
    this.tenantId = await this.worker.data.tenant('acme-charging');
    const siteId = await this.worker.data.site(this.tenantId, 'Riverside');
    const chargerId = await this.worker.data.charger(this.tenantId, siteId, 'WW-PAY');
    const connectorId = await this.worker.data.connector(this.tenantId, chargerId, 1, 50);
    this.place = { tenantId: this.tenantId, siteId, chargerId, connectorId };
    this.versionId = (await this.worker.tariffs.create(this.tenantId, 'Standard')).versionId;
    const account = await this.worker.gateway.createAccount({
      tenantId: this.tenantId,
      tenantName: 'Acme',
      country: 'GB',
      email: null,
      idempotencyKey: 'account:acme',
    });
    this.providerAccountId = account.providerAccountId;
    await this.worker.payments.account(this.tenantId, {
      providerAccountId: this.providerAccountId,
    });
  }

  async stop(): Promise<void> {
    await this.worker.stop();
  }

  static ago(minutes: number): string {
    return new Date(Date.now() - minutes * 60_000).toISOString();
  }

  paymentOf(sessionId: string) {
    return this.worker.row(
      `select status, captured_amount::int, review_flags,
         auto_stop_requested_at is not null as is_stop_requested
       from payments where session_id = $1`,
      [sessionId],
    );
  }

  sessionOf(id: string) {
    return this.worker.row('select status, failure_reason from charging_sessions where id = $1', [
      id,
    ]);
  }

  /** A hold at the provider, and the payment row that knows it; confirmed by the driver unless told otherwise. */
  async hold(sessionId: string, holdAmount = 5000, isConfirmed = true): Promise<string> {
    const hold = await this.worker.gateway.createHold({
      accountId: this.providerAccountId,
      amount: holdAmount,
      currency: 'GBP',
      description: '',
      metadata: {},
      idempotencyKey: `hold:${sessionId}`,
    });
    if (isConfirmed) {
      this.worker.gateway.confirm(hold.providerPaymentId);
    }
    await this.worker.payments.payment(this.tenantId, sessionId, {
      status: isConfirmed ? 'authorised' : 'pending',
      holdAmount,
      authorizedAmount: isConfirmed ? holdAmount : null,
      providerAccountId: this.providerAccountId,
      providerPaymentId: hold.providerPaymentId,
    });
    return hold.providerPaymentId;
  }

  /** A paid session the charger has not started: no transaction id, no readings. */
  waitingSession(
    status: 'authorising' | 'starting' | 'failed',
    minutesAgo: number,
    extra: TestSessionOptions = {},
  ): Promise<string> {
    const at = PaymentJobsFixture.ago(minutesAgo);
    return this.worker.sessions.create(this.place, {
      status,
      tariffVersionId: this.versionId,
      hasStarted: false,
      startedAt: at,
      endedAt: null,
      unpluggedAt: null,
      meterStopWh: null,
      readings: [],
      history: [{ from: null, to: 'authorising', event: 'hold_requested', at }],
      lastEventAt: at,
      ...extra,
    });
  }
}
