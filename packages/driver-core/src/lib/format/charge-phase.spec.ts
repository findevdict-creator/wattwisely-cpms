import { Charge } from '../api/models/charge';
import { ChargePhases } from './charge-phase';

describe('ChargePhases', () => {
  const charge = (
    sessionStatus: Charge['session_status'],
    paymentStatus: Charge['payment_status'],
  ): Charge => ({ session_status: sessionStatus, payment_status: paymentStatus }) as Charge;

  it('names the page for each state of the session and the payment', () => {
    expect(ChargePhases.of(charge('authorising', 'pending'))).toBe('card');
    expect(ChargePhases.of(charge('authorising', 'authorised'))).toBe('starting');
    expect(ChargePhases.of(charge('starting', 'authorised'))).toBe('starting');
    expect(ChargePhases.of(charge('charging', 'authorised'))).toBe('charging');
    expect(ChargePhases.of(charge('idle', 'authorised'))).toBe('charging');
    expect(ChargePhases.of(charge('stopping', 'authorised'))).toBe('finishing');
    expect(ChargePhases.of(charge('completed', 'captured'))).toBe('done');
    expect(ChargePhases.of(charge('not_started', 'failed'))).toBe('failed');
    expect(ChargePhases.of(charge('failed', 'released'))).toBe('failed');
  });

  it('keeps asking the API until the money has moved', () => {
    expect(ChargePhases.isLive(charge('charging', 'authorised'))).toBe(true);
    expect(ChargePhases.isLive(charge('completed', 'authorised'))).toBe(true);
    expect(ChargePhases.isLive(charge('completed', 'captured'))).toBe(false);
    expect(ChargePhases.isLive(charge('completed', 'released'))).toBe(false);
    expect(ChargePhases.isLive(charge('not_started', 'failed'))).toBe(false);
  });
});
