import { PaymentMethod } from '@wattwisely/driver-core';
import { CardWords } from './card-words';

describe('CardWords', () => {
  const card = (changes: Partial<PaymentMethod>): PaymentMethod => ({
    id: 'pm-1',
    brand: 'visa',
    last4: '4242',
    exp_month: 4,
    exp_year: 2028,
    is_default: false,
    created_at: '2026-01-01T00:00:00Z',
    ...changes,
  });
  const now = new Date('2026-10-29T12:00:00Z');

  it('says when a card expires, and that it works to the end of its month', () => {
    expect(CardWords.expiry(card({}), now)).toBe('Expires 04/28');
    expect(CardWords.expiry(card({ exp_month: 9, exp_year: 2026 }), now)).toBe('Expired 09/26');
    expect(CardWords.isExpired(card({ exp_month: 10, exp_year: 2026 }), now)).toBe(false);
    expect(
      CardWords.isExpired(card({ exp_month: 10, exp_year: 2026 }), new Date('2026-11-01')),
    ).toBe(true);
  });

  it('names the default card under "Payment methods"', () => {
    const mastercard = card({ id: 'pm-2', brand: 'mastercard', last4: '5555', is_default: true });
    expect(CardWords.summary([card({}), mastercard])).toBe('Mastercard •••• 5555 is default');
    expect(CardWords.summary([])).toBe('No card yet');
  });
});
