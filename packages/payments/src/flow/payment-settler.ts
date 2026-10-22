import { Transaction } from '@wattwisely/db';
import { SessionRow, SessionStates, SessionStore } from '@wattwisely/session-engine';
import { HoldState, PaymentGateway } from '../gateway/payment-gateway';
import { PaymentGatewayError } from '../gateway/payment-gateway.error';
import { PaymentRow } from '../store/payment-rows';
import { PaymentStore } from '../store/payment-store';
import { CapturePolicy } from './capture-policy';
import { SessionAnnouncer } from './session-announcer';

/** A payment and the session it belongs to, settled together. */
interface Settlement {
  payment: PaymentRow;
  session: SessionRow;
}

/**
 * Settles the hold of a session that has ended (Stripe Payments design, "Capture"): a
 * completed session's final price is captured (never more than the hold; 0 releases the
 * hold instead), and a session that never charged or failed has its hold released. The
 * idempotency keys are the session's, so a retry after a crash can never charge twice.
 */
export class PaymentSettler {
  constructor(
    private readonly gateway: PaymentGateway,
    private readonly payments = new PaymentStore(),
    private readonly sessions = new SessionStore(),
    private readonly announcer = new SessionAnnouncer(),
  ) {}

  /** True when the payment changed (settled, or put back for a later try). */
  async settle(tx: Transaction, payment: PaymentRow, now: Date): Promise<boolean> {
    const session = await this.sessions.find(tx, payment.sessionId);
    if (!session || !SessionStates.isEnd(session.status)) {
      return false;
    }
    const settlement = { payment, session };
    try {
      const hold = await this.perform(payment, session);
      await this.record(tx, settlement, hold, now);
    } catch (error) {
      await this.tryLater(tx, settlement, error, now);
    }
    return true;
  }

  private perform(payment: PaymentRow, session: SessionRow): Promise<HoldState> {
    const request = {
      accountId: payment.providerAccountId,
      providerPaymentId: payment.providerPaymentId,
    };
    const capture = PaymentSettler.captureOf(payment, session);
    if (capture.amount === 0) {
      return this.gateway.cancel({ ...request, idempotencyKey: `cancel:${session.id}` });
    }
    return this.gateway.capture({
      ...request,
      amount: capture.amount,
      idempotencyKey: `capture:${session.id}`,
    });
  }

  private static captureOf(payment: PaymentRow, session: SessionRow) {
    if (payment.status !== 'authorised' || session.status !== 'completed') {
      return { amount: 0, isAboveHold: false };
    }
    return CapturePolicy.amountToCapture(
      session.grossAmount,
      payment.authorizedAmount ?? payment.holdAmount,
    );
  }

  private async record(
    tx: Transaction,
    { payment, session }: Settlement,
    hold: HoldState,
    now: Date,
  ): Promise<void> {
    const flags = PaymentSettler.captureOf(payment, session).isAboveHold
      ? [...new Set([...payment.reviewFlags, CapturePolicy.ABOVE_HOLD_FLAG])]
      : payment.reviewFlags;
    const change = PaymentSettler.changeFor(hold, now);
    await this.payments.update(tx, payment.id, {
      ...change,
      reviewFlags: flags,
      nextAttemptAt: null,
    });
    await this.announcer.announce(tx, session, {
      status: session.status,
      paymentStatus: change.status,
    });
  }

  private static changeFor(hold: HoldState, now: Date) {
    switch (hold.status) {
      case 'captured':
        return {
          status: 'captured' as const,
          capturedAmount: hold.amountCaptured,
          capturedAt: now,
        };
      case 'cancelled':
        return { status: 'released' as const, releasedAt: now };
      default:
        return {
          status: 'capture_failed' as const,
          failureCode: hold.failure?.code ?? null,
          failureMessage: hold.failure?.message ?? `The provider answered ${hold.status}.`,
          failedAt: now,
        };
    }
  }

  /** A provider outage is retried with a growing wait; anything else, or 72 hours of it, needs a person. */
  private async tryLater(
    tx: Transaction,
    { payment, session }: Settlement,
    error: unknown,
    now: Date,
  ): Promise<void> {
    const message = (error as Error).message ?? String(error);
    const closedAt = session.endedAt ?? session.startedAt;
    const isFinal =
      !PaymentGatewayError.isRetryable(error) || CapturePolicy.isGivenUp(closedAt, now);
    await this.payments.update(tx, payment.id, {
      captureAttempts: payment.captureAttempts + 1,
      failureMessage: message.slice(0, 500),
      ...(isFinal
        ? { status: 'capture_failed', failedAt: now, nextAttemptAt: null }
        : { nextAttemptAt: CapturePolicy.nextAttemptAt(payment.captureAttempts, now) }),
    });
  }
}
