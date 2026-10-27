import { Charge } from '../core/api/models/charge';
import { ChargeHold } from './charge-hold';

describe('ChargeHold', () => {
  const paid = { payment_status: 'captured', hold_amount: 4000, amount: 880, receipt: null };

  it('gives back the part of the hold the charge did not use', () => {
    expect(ChargeHold.released(paid as unknown as Charge)).toBe(3120);
  });

  it('has nothing to give back before the payment is taken, or when all of it was used', () => {
    expect(
      ChargeHold.released({ ...paid, payment_status: 'authorised' } as unknown as Charge),
    ).toBeNull();
    expect(ChargeHold.released({ ...paid, amount: 4000 } as unknown as Charge)).toBeNull();
  });
});
