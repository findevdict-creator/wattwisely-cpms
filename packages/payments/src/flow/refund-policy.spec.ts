import { PaymentRow, RefundRow } from '../store/payment-rows';
import { RefundPolicy } from './refund-policy';

describe('RefundPolicy', () => {
  const payment = (status: PaymentRow['status'], capturedAmount: number | null) =>
    ({ status, capturedAmount }) as PaymentRow;
  const refund = (status: RefundRow['status'], requestedBy: string) =>
    ({ status, requestedBy }) as RefundRow;

  it('needs a second person above 100.00', () => {
    expect(RefundPolicy.needsApproval(10_000)).toBe(false);
    expect(RefundPolicy.needsApproval(10_001)).toBe(true);
  });

  it('allows only what was captured and not yet refunded or reserved', () => {
    expect(RefundPolicy.available(payment('captured', 15_000), 2_500)).toBe(12_500);
    expect(RefundPolicy.available(payment('partially_refunded', 15_000), 15_000)).toBe(0);
    expect(RefundPolicy.available(payment('authorised', null), 0)).toBe(0);
    expect(RefundPolicy.available(payment('released', null), 0)).toBe(0);
  });

  it('lets anyone but the requester approve a waiting refund', () => {
    expect(RefundPolicy.canApprove(refund('awaiting_approval', 'olivia'), 'oscar')).toBe(true);
    expect(RefundPolicy.canApprove(refund('awaiting_approval', 'olivia'), 'olivia')).toBe(false);
    expect(RefundPolicy.canApprove(refund('pending', 'olivia'), 'oscar')).toBe(false);
  });

  it('marks the payment refunded once everything came back', () => {
    expect(RefundPolicy.statusAfterRefund(payment('captured', 880), 500)).toBe(
      'partially_refunded',
    );
    expect(RefundPolicy.statusAfterRefund(payment('captured', 880), 880)).toBe('refunded');
  });
});
