import { PaymentAccount, PaymentAccountStatus } from '../../core/api/models/payment';

/** What the account card offers next. */
export interface AccountAction {
  kind: 'connect' | 'onboard' | 'dashboard' | 'none';
  label: string;
  hint: string;
}

/** Turns the account's status into the one thing to do next, in plain words. */
export class PaymentAccountAction {
  static readonly DISABLED: AccountAction = {
    kind: 'none',
    label: '',
    hint: 'Card payments are switched off on this installation: no Stripe keys are set.',
  };

  static readonly BY_STATUS: Record<PaymentAccountStatus, AccountAction> = {
    not_connected: {
      kind: 'connect',
      label: 'Connect Stripe',
      hint: 'Drivers pay by card once your Stripe account is connected and set up.',
    },
    pending: {
      kind: 'onboard',
      label: 'Continue setup in Stripe',
      hint: 'Stripe still needs some details before you can take payments.',
    },
    restricted: {
      kind: 'onboard',
      label: 'Fix in Stripe',
      hint: 'Stripe has paused payments until the overdue details are provided.',
    },
    active: {
      kind: 'dashboard',
      label: 'Open Stripe dashboard',
      hint: 'Payouts, disputes and statements live in your Stripe Express dashboard.',
    },
  };

  static of(account: PaymentAccount): AccountAction {
    if (!account.is_provider_enabled) {
      return PaymentAccountAction.DISABLED;
    }
    return PaymentAccountAction.BY_STATUS[account.status] ?? PaymentAccountAction.BY_STATUS.active;
  }

  /** What `?stripe=return|refresh` after an onboarding link means for the page. */
  static afterOnboarding(query: string | null): 'returned' | 'expired' | null {
    if (query === 'return') {
      return 'returned';
    }
    return query === 'refresh' ? 'expired' : null;
  }
}
