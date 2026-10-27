import { SessionDetail, SessionReading } from '../../core/api/models/session';
import { SessionFigures } from './session-figures';

describe('SessionFigures', () => {
  const session = (extra: Partial<SessionDetail> = {}) =>
    ({
      started_at: '2026-10-21T16:30:00Z',
      ended_at: '2026-10-21T17:12:00Z',
      unplugged_at: '2026-10-21T17:37:00Z',
      energy_wh: 22_000,
      meter_start_wh: 18_412_600,
      meter_stop_wh: 18_434_600,
      gross_amount: 880,
      currency: 'GBP',
      is_priced: true,
      payment: null,
      payment_rule: null,
      ...extra,
    }) as SessionDetail;

  it('gives the energy with the meter readings', () => {
    expect(SessionFigures.energy(session())).toEqual({
      value: '22 kWh',
      foot: 'Meter 18,412.6 to 18,434.6',
    });
  });

  it('counts the time until the car left, else until the charge stopped', () => {
    expect(SessionFigures.duration(session()).value).toBe('1 h 07');
    const stopped = session({ unplugged_at: null });
    expect(SessionFigures.duration(stopped).foot).toBe('Until the charge stopped');
  });

  it('takes the highest power reported and the average over the charge', () => {
    const readings = [{ power_w: 48_000 }, { power_w: 21_000 }] as SessionReading[];
    expect(SessionFigures.power(session(), readings)).toEqual({
      value: '48 kW',
      foot: 'Average 31 kW',
    });
    expect(SessionFigures.power(session(), []).value).toBe('—');
  });

  it('says whether the total is final', () => {
    expect(SessionFigures.total(session({ is_priced: false })).foot).toBe('So far');
    expect(SessionFigures.total(session()).foot).toBe('Not paid by card');
  });
});
