import { Transaction } from '@wattwisely/db';
import { SessionEvent, SessionStore, SessionTransitions } from '@wattwisely/session-engine';
import { HoldState } from '../gateway/payment-gateway';
import { PaymentRow, PaymentStatus, PaymentStatuses } from '../store/payment-rows';
import { PaymentStore } from '../store/payment-store';
import { CommandQueuer } from './command-queuer';
import { RemoteSessionStarter } from './remote-session-starter';
import { SessionAnnouncer } from './session-announcer';

/**
 * Applies what the provider says about a hold to the payment and its session (Stripe
 * Payments design, "Start" and "When it goes wrong"). The same report may arrive twice,
 * from the confirm check and from the webhook, so every step is a no-op the second time.
 * A confirmed hold moves the session to starting and sends RemoteStart; a declined one
 * ends it as not_started; a captured or cancelled hold is recorded as such.
 */
export class HoldAuthoriser {
  private readonly payments = new PaymentStore();
  private readonly sessions = new SessionStore();
  private readonly transitions = new SessionTransitions();
  private readonly commands = new CommandQueuer();
  private readonly announcer = new SessionAnnouncer();
  private readonly starter = new RemoteSessionStarter();

  /** True when the payment or the session changed. */
  async apply(tx: Transaction, payment: PaymentRow, hold: HoldState, now: Date) {
    switch (hold.status) {
      case 'authorised':
        return this.authorised(tx, payment, hold, now);
      case 'failed':
        return this.failed(tx, payment, hold, now);
      case 'cancelled':
        return this.cancelled(tx, payment, now);
      case 'captured':
        return this.captured(tx, payment, hold, now);
      default:
        return false;
    }
  }

  private async authorised(tx: Transaction, payment: PaymentRow, hold: HoldState, now: Date) {
    if (payment.status !== 'pending') {
      return false;
    }
    await this.payments.update(tx, payment.id, {
      status: 'authorised',
      authorizedAmount: hold.amountCapturable ?? hold.amount,
      authorizedAt: now,
      // A hold on a saved card (module 19) already knows its card; the provider may not repeat it.
      cardBrand: hold.card?.brand ?? payment.cardBrand,
      cardLast4: hold.card?.last4 ?? payment.cardLast4,
    });
    const session = await this.sessions.find(tx, payment.sessionId);
    if (session) {
      await this.starter.start(tx, session, now, 'authorised');
    }
    return true;
  }

  private async failed(tx: Transaction, payment: PaymentRow, hold: HoldState, now: Date) {
    if (payment.status !== 'pending') {
      return false;
    }
    await this.payments.update(tx, payment.id, {
      status: 'failed',
      failureCode: hold.failure?.code ?? null,
      failureMessage: hold.failure?.message ?? 'The card was declined.',
      failedAt: now,
    });
    await this.endSession(tx, payment.sessionId, {
      event: 'declined',
      paymentStatus: 'failed',
      now,
    });
    return true;
  }

  private async cancelled(tx: Transaction, payment: PaymentRow, now: Date) {
    if (!PaymentStatuses.OPEN.includes(payment.status)) {
      return false;
    }
    await this.payments.update(tx, payment.id, { status: 'released', releasedAt: now });
    await this.endSession(tx, payment.sessionId, {
      event: 'declined',
      paymentStatus: 'released',
      now,
    });
    return true;
  }

  private async captured(tx: Transaction, payment: PaymentRow, hold: HoldState, now: Date) {
    if (!PaymentStatuses.OPEN.includes(payment.status)) {
      return false;
    }
    await this.payments.update(tx, payment.id, {
      status: 'captured',
      authorizedAmount: payment.authorizedAmount ?? hold.amount,
      capturedAmount: hold.amountCaptured ?? hold.amount,
      capturedAt: now,
      cardBrand: hold.card?.brand ?? payment.cardBrand,
      cardLast4: hold.card?.last4 ?? payment.cardLast4,
    });
    return true;
  }

  /** Ends a session that never charged; one that did is left to the pricing and the settler. */
  private async endSession(
    tx: Transaction,
    sessionId: string,
    end: { event: SessionEvent; paymentStatus: PaymentStatus; now: Date },
  ): Promise<void> {
    const session = await this.sessions.find(tx, sessionId);
    if (!session) {
      return;
    }
    const event: SessionEvent = session.status === 'starting' ? 'start_rejected' : end.event;
    const moved = await this.transitions.apply(tx, session, event, { occurredAt: end.now });
    if (moved?.isChanged) {
      await this.sessions.saveFailure(tx, session.id, event);
      if (session.commandId) {
        await this.commands.expireQueued(tx, session.commandId);
      }
      await this.announcer.announce(tx, session, {
        status: moved.status,
        paymentStatus: end.paymentStatus,
      });
    }
  }
}
