import { AccountState } from '../gateway/payment-gateway';
import { AccountStatusPolicy } from './account-status-policy';

describe('AccountStatusPolicy', () => {
  const state = (changes: Partial<AccountState> = {}): AccountState => ({
    providerAccountId: 'acct_1',
    isChargesEnabled: false,
    isPayoutsEnabled: false,
    isDetailsSubmitted: false,
    country: 'GB',
    defaultCurrency: null,
    requirements: { currentlyDue: [], pastDue: [], disabledReason: null },
    ...changes,
  });

  it('is pending until Stripe enables charges, then active', () => {
    expect(AccountStatusPolicy.statusOf(state(), null)).toBe('pending');
    expect(AccountStatusPolicy.statusOf(state({ isChargesEnabled: true }), 'pending')).toBe(
      'active',
    );
  });

  it('is restricted when charges were switched off again or details are overdue', () => {
    expect(AccountStatusPolicy.statusOf(state(), 'active')).toBe('restricted');
    const overdue = state({
      requirements: { currentlyDue: [], pastDue: ['id'], disabledReason: null },
    });
    expect(AccountStatusPolicy.statusOf(overdue, 'pending')).toBe('restricted');
    expect(AccountStatusPolicy.canTakePayments('restricted')).toBe(false);
    expect(AccountStatusPolicy.canTakePayments('active')).toBe(true);
  });
});
