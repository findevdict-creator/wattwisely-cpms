import { DriverCharge } from '@wattwisely/driver-core';
import { ChargeHistory } from './charge-history';

describe('ChargeHistory', () => {
  const charge = (id: string, tenantId: string, startedAt: string, extra = {}): DriverCharge =>
    ({
      id,
      tenant_id: tenantId,
      operator_name: tenantId === 't1' ? 'Acme Charging' : 'GreenPark Fleet',
      status: 'completed',
      time_zone: 'Europe/Dublin',
      started_at: startedAt,
      payment_rule: { outcome: 'pay', words: 'You pay' },
      payment: null,
      ...extra,
    }) as unknown as DriverCharge;
  const charges = [
    charge('c1', 't1', '2026-10-21T15:30:00Z'),
    charge('c2', 't2', '2026-10-20T06:55:00Z'),
    charge('c3', 't1', '2026-09-28T08:12:00Z'),
  ];

  it('groups the charges by month at the site, newest first', () => {
    const months = ChargeHistory.months(charges, '');
    expect(months.map((month) => month.label)).toEqual(['October 2026', 'September 2026']);
    expect(months[0].charges.map((item) => item.id)).toEqual(['c1', 'c2']);
  });

  it('keeps one operator’s charges, and lists the operators for the filter', () => {
    expect(ChargeHistory.months(charges, 't2')).toEqual([
      { label: 'October 2026', charges: [charges[1]] },
    ]);
    expect(ChargeHistory.operators(charges)).toEqual([
      { id: 't1', name: 'Acme Charging' },
      { id: 't2', name: 'GreenPark Fleet' },
    ]);
  });

  it('says how a charge ended and who paid, or that the card was refused', () => {
    expect(ChargeHistory.state(charges[0])).toBe('Done · You pay');
    const refused = charge('c5', 't1', '2026-10-11T12:20:00Z', {
      status: 'not_started',
      payment: { status: 'failed' },
    });
    expect(ChargeHistory.state(refused)).toBe('Card refused · nothing taken');
    expect(ChargeHistory.isRefused(refused)).toBe(true);
  });
});
