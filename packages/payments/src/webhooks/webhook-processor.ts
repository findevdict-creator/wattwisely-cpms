import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { PaymentEvent, ReceivedEvent } from '../gateway/payment-gateway';
import { HoldAuthoriser } from '../flow/hold-authoriser';
import { RefundRecorder } from '../flow/refund-recorder';
import { PaymentAccountStore } from '../store/payment-account-store';
import { PaymentStore } from '../store/payment-store';
import { RefundStore } from '../store/refund-store';

/**
 * Handles one verified webhook event (Stripe Payments design, "Webhooks"). The event
 * names a connected account; the account row tells which tenant it is, and the rest
 * happens in that tenant's transaction. Handlers check the current state before acting,
 * because events can arrive out of order or twice.
 */
export class WebhookProcessor {
  private readonly accounts = new PaymentAccountStore();
  private readonly payments = new PaymentStore();
  private readonly refunds = new RefundStore();
  private readonly holds = new HoldAuthoriser();
  private readonly refundRecorder = new RefundRecorder();

  constructor(private readonly runner: TransactionRunner) {}

  /** True when something was changed; false when the event was of no use (unknown account, nothing to do). */
  async process(received: ReceivedEvent, now: Date): Promise<boolean> {
    if (received.event.kind === 'ignored' || !received.accountId) {
      return false;
    }
    const tenantId = await this.tenantOf(received.accountId);
    if (!tenantId) {
      return false;
    }
    return this.runner.run(DatabaseSession.forTenant(tenantId), (tx) =>
      this.apply(tx, received.event, now),
    );
  }

  private async tenantOf(providerAccountId: string): Promise<string | null> {
    const account = await this.runner.run(
      DatabaseSession.forProviderAccount(providerAccountId),
      (tx) => this.accounts.findByProviderAccountId(tx, providerAccountId),
    );
    return account?.tenantId ?? null;
  }

  private async apply(tx: Transaction, event: PaymentEvent, now: Date): Promise<boolean> {
    switch (event.kind) {
      case 'hold_changed': {
        const found = await this.payments.findByProviderPaymentId(tx, event.hold.providerPaymentId);
        const payment = found ? await this.payments.findForUpdate(tx, found.id) : null;
        return payment ? this.holds.apply(tx, payment, event.hold, now) : false;
      }
      case 'refund_changed': {
        const refund = await this.refunds.findByProviderRefundId(tx, event.refund.providerRefundId);
        return refund ? this.refundRecorder.apply(tx, refund, event.refund, now) : false;
      }
      case 'account_changed': {
        const account = await this.accounts.findCurrent(tx);
        if (!account) {
          return false;
        }
        await this.accounts.sync(tx, account, event.account, now);
        return true;
      }
      default:
        return false;
    }
  }
}
