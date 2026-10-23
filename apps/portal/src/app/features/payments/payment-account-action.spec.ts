import { PaymentAccount } from '../../core/api/models/payment';
import { PaymentAccountAction } from './payment-account-action';

describe('PaymentAccountAction', () => {
  const account = (changes: Partial<PaymentAccount>): PaymentAccount =>
    ({ status: 'not_connected', is_provider_enabled: true, ...changes }) as PaymentAccount;

  it('offers the next step for each account status', () => {
    expect(PaymentAccountAction.of(account({})).kind).toBe('connect');
    expect(PaymentAccountAction.of(account({ status: 'pending' })).kind).toBe('onboard');
    expect(PaymentAccountAction.of(account({ status: 'restricted' }))).toMatchObject({
      kind: 'onboard',
      label: 'Fix in Stripe',
    });
    expect(PaymentAccountAction.of(account({ status: 'active' })).kind).toBe('dashboard');
  });

  it('offers nothing when the installation has no Stripe keys', () => {
    expect(PaymentAccountAction.of(account({ is_provider_enabled: false }))).toMatchObject({
      kind: 'none',
    });
  });

  it('reads what Stripe sent the person back for', () => {
    expect(PaymentAccountAction.afterOnboarding('return')).toBe('returned');
    expect(PaymentAccountAction.afterOnboarding('refresh')).toBe('expired');
    expect(PaymentAccountAction.afterOnboarding(null)).toBeNull();
  });
});
