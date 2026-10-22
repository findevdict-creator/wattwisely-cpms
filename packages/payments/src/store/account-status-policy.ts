import { AccountState } from '../gateway/payment-gateway';
import { PaymentAccountStatus } from './payment-rows';

/**
 * What a connected account's report means for the tenant (Stripe Payments design,
 * "Tenant onboarding"): active while charges are enabled; restricted when they were
 * switched off again, or the provider is waiting for overdue details; pending otherwise.
 */
export class AccountStatusPolicy {
  static statusOf(
    state: AccountState,
    previous: PaymentAccountStatus | null,
  ): PaymentAccountStatus {
    if (state.isChargesEnabled) {
      return 'active';
    }
    const isHeldBack =
      state.requirements.pastDue.length > 0 || state.requirements.disabledReason !== null;
    return previous === 'active' || isHeldBack ? 'restricted' : 'pending';
  }

  /** Paid sessions may start only on an active account. */
  static canTakePayments(status: PaymentAccountStatus): boolean {
    return status === 'active';
  }
}
