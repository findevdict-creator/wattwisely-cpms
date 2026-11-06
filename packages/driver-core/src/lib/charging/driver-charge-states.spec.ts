import { DriverChargeDetail } from '../api/models/driver-payments';
import { DriverChargeStates } from './driver-charge-states';
import { ReceiptFileName } from './receipt-file-name';

describe('DriverChargeStates', () => {
  const held: DriverChargeDetail['payment'] = {
    status: 'authorised',
    hold_amount: 2000,
    card_brand: 'visa',
    card_last4: '4242',
    failure_message: null,
  };
  const charge = (changes: Partial<DriverChargeDetail> = {}): DriverChargeDetail => ({
    id: 'session-1',
    tenant_id: 'acme',
    operator_name: 'Acme Charging',
    site_name: 'Riverside Car Park',
    charger_identity: 'SIM-001',
    connector_label: 'B',
    ocpp_connector_id: 1,
    status: 'charging',
    time_zone: 'Europe/Dublin',
    started_at: '2026-10-21T18:00:00Z',
    ended_at: null,
    energy_wh: 0,
    currency: 'EUR',
    amount: null,
    is_paid: true,
    start_source: 'account',
    payment_rule: null,
    payment: held,
    failure_reason: null,
    receipt: null,
    can_stop: true,
    is_stop_requested: false,
    charge_key: null,
    ...changes,
  });

  it('picks the screen and the step for each state of the charge', () => {
    expect(DriverChargeStates.view(charge({ status: 'authorising' }))).toBe('starting');
    expect(DriverChargeStates.view(charge({ status: 'idle' }))).toBe('live');
    expect(DriverChargeStates.view(charge({ status: 'completed' }))).toBe('complete');
    expect(DriverChargeStates.view(charge({ status: 'not_started' }))).toBe('failed');
    const refused = { ...held, status: 'failed' };
    expect(DriverChargeStates.view(charge({ status: 'authorising', payment: refused }))).toBe(
      'failed',
    );
    expect(DriverChargeStates.phase(charge({ status: 'stopping' }))).toBe('finishing');
    expect(DriverChargeStates.phase(charge({ status: 'suspended' }))).toBe('charging');
    expect(DriverChargeStates.phase(charge({ status: 'completed' }))).toBe('done');
  });

  it('waits for the hold to be taken before it calls a charge settled', () => {
    const completed = charge({ status: 'completed' });
    expect(DriverChargeStates.isSettled(completed)).toBe(false);
    const captured = { ...held, status: 'captured' };
    expect(DriverChargeStates.isSettled({ ...completed, payment: captured })).toBe(true);
    expect(DriverChargeStates.isSettled({ ...completed, is_paid: false, payment: null })).toBe(
      true,
    );
  });

  it('gives back the part of the hold the charge did not use, once it is taken', () => {
    const done = charge({ status: 'completed', amount: 880 });
    expect(DriverChargeStates.released(done)).toBeNull();
    const captured = { ...done, payment: { ...held, status: 'captured' } };
    expect(DriverChargeStates.released(captured)).toBe(1120);
    expect(DriverChargeStates.released({ ...captured, amount: 2000 })).toBeNull();
    expect(DriverChargeStates.released({ ...captured, payment: null })).toBeNull();
  });

  it('names the receipt after the day and the site', () => {
    expect(ReceiptFileName.of(charge())).toBe('receipt-2026-10-21-riverside-car-park.pdf');
  });
});
