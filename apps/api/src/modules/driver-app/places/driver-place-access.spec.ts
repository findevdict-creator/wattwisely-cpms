import { PaymentRules } from '@wattwisely/payments';
import { DriverPlaceAccess, DriverPlaceAccessPolicy } from './driver-place-access';

/** Module 19: a start from the app is refused for the same reasons a card tap is. */
describe('DriverPlaceAccessPolicy', () => {
  const paid = { ...PaymentRules.OPERATOR, holdAmount: 2000 };
  const free = {
    outcome: 'free' as const,
    decided_by: 'group' as const,
    label: 'Staff',
    holdAmount: null,
  };
  const access = (change: Partial<DriverPlaceAccess> = {}): DriverPlaceAccess => ({
    tenantId: 't',
    driver: { id: 'd', name: 'Dana', status: 'active', isGuest: false },
    visibility: 'public',
    isMemberAtSite: false,
    account: null,
    isPaymentAccepted: true,
    rule: paid,
    card: { driverAccountId: 'a', customerId: 'cus', card: {} as never },
    ...change,
  });
  const open = { availability: 'available' as const, hasTariff: true };
  const refusal = DriverPlaceAccessPolicy.refusal;

  it('lets a paid start through with a card, and a free one without anything', () => {
    expect(refusal(access(), open)).toBeNull();
    expect(
      refusal(access({ rule: free, card: null, isPaymentAccepted: false }), {
        availability: 'available',
        hasTariff: false,
      }),
    ).toBeNull();
  });

  it('refuses in the order a driver can do something about it', () => {
    const blocked = { id: 'd', name: 'Dana', status: 'blocked' as const, isGuest: false };
    expect(refusal(access({ driver: blocked }), open)).toBe('driver_blocked');
    expect(refusal(access({ visibility: 'private' }), open)).toBe('private_site');
    expect(refusal(access({ visibility: 'private', isMemberAtSite: true }), open)).toBeNull();
    expect(refusal(access(), { availability: 'busy', hasTariff: true })).toBe('plug_unavailable');
    expect(refusal(access(), { availability: 'available', hasTariff: false })).toBe('no_tariff');
    expect(refusal(access({ isPaymentAccepted: false }), open)).toBe('payments_not_accepted');
    expect(refusal(access({ card: null }), open)).toBe('no_payment_method');
  });
});
