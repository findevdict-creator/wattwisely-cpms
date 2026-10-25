import { DriverChargeDetail } from '../../core/api/models/driver-payments';
import { MyChargeStore } from './my-charge.store';

describe('MyChargeStore', () => {
  const charge = (status: string, paymentStatus: string | null) =>
    ({
      status,
      payment: paymentStatus ? { status: paymentStatus } : null,
    }) as DriverChargeDetail;

  it('keeps following until the session ended and its hold was settled', () => {
    expect(MyChargeStore.isSettled(charge('charging', 'authorised'))).toBe(false);
    expect(MyChargeStore.isSettled(charge('completed', 'authorised'))).toBe(false);
    expect(MyChargeStore.isSettled(charge('completed', 'captured'))).toBe(true);
    expect(MyChargeStore.isSettled(charge('completed', null))).toBe(true);
    expect(MyChargeStore.isSettled(charge('not_started', 'failed'))).toBe(true);
  });
});
