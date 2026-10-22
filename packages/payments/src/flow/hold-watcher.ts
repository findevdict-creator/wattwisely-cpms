import { Transaction } from '@wattwisely/db';
import { SessionRow } from '@wattwisely/session-engine';
import { PaymentStore } from '../store/payment-store';
import { CapturePolicy } from './capture-policy';
import { CommandQueuer } from './command-queuer';

/**
 * Keeps a paid session inside its hold (Stripe Payments design, "Stopping before the
 * hold runs out"): when the cost so far reaches 90% of the hold, the charger is asked
 * to stop, once. The live cost job calls it after each update.
 */
export class HoldWatcher {
  constructor(
    private readonly payments = new PaymentStore(),
    private readonly commands = new CommandQueuer(),
  ) {}

  /** True when a stop was sent this time. */
  async watch(tx: Transaction, session: SessionRow, grossAmount: number, now: Date) {
    if (!session.isPaid || session.ocppTransactionId === null) {
      return false;
    }
    const payment = await this.payments.findBySession(tx, session.id);
    if (!payment || payment.status !== 'authorised' || payment.autoStopRequestedAt) {
      return false;
    }
    const hold = payment.authorizedAmount ?? payment.holdAmount;
    if (!CapturePolicy.isAutoStopDue(grossAmount, hold)) {
      return false;
    }
    await this.commands.remoteStop(tx, session, session.ocppTransactionId);
    await this.payments.update(tx, payment.id, { autoStopRequestedAt: now });
    return true;
  }
}
