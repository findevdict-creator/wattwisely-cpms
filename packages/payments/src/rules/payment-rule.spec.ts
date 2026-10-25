import { GroupPaymentSettings, PaymentLevels, PaymentRules } from './payment-rule';

/** Module 19, decision 1: who pays, and how much is held. */
describe('PaymentRules', () => {
  const holds = { holdAmount: 5000, memberHoldAmount: 2000 };
  const group = (
    name: string,
    paymentMode: GroupPaymentSettings['paymentMode'],
    holdAmount: number | null = null,
  ) => ({
    name,
    paymentMode,
    holdAmount,
  });
  const levels = (change: Partial<PaymentLevels> = {}): PaymentLevels => ({
    card: null,
    driver: 'inherit',
    groups: [],
    isGuest: false,
    ...change,
  });

  it('falls through to the operator, which always says pay, with the member hold', () => {
    expect(PaymentRules.resolve(levels(), holds)).toEqual({
      outcome: 'pay',
      decided_by: 'operator',
      label: null,
      holdAmount: 2000,
    });
    expect(PaymentRules.resolve(levels({ isGuest: true }), holds).holdAmount).toBe(5000);
    expect(PaymentRules.resolve(levels(), null).holdAmount).toBeNull();
  });

  it('lets any free group make the session free, unless the driver or card says pay', () => {
    const groups = [group('Visitors', 'pay'), group('Depot staff', 'free')];
    expect(PaymentRules.resolve(levels({ groups }), holds)).toEqual({
      outcome: 'free',
      decided_by: 'group',
      label: 'Depot staff',
      holdAmount: null,
    });
    expect(PaymentRules.decide(levels({ groups, driver: 'pay' }))).toEqual({
      outcome: 'pay',
      decided_by: 'driver',
      label: null,
    });
    expect(PaymentRules.decide(levels({ groups, card: 'pay' })).decided_by).toBe('card');
    expect(PaymentRules.decide(levels({ driver: 'free', card: 'inherit' })).decided_by).toBe(
      'driver',
    );
  });

  it('holds the lowest amount a group sets, else the member hold', () => {
    const groups = [
      group('Fleet', 'pay', 3000),
      group('Night', 'inherit', 1500),
      group('Other', 'inherit'),
    ];
    expect(PaymentRules.resolve(levels({ groups }), holds)).toMatchObject({
      outcome: 'pay',
      decided_by: 'group',
      label: 'Fleet',
      holdAmount: 1500,
    });
    expect(PaymentRules.holdFor(levels({ groups: [group('Other', 'pay')] }), holds)).toBe(2000);
  });
});
