import { UsageRow } from '../../core/api/models/report';
import { UsageFigures } from './usage-figures';

describe('UsageFigures', () => {
  it('shows energy in kWh and time in hours', () => {
    expect(UsageFigures.energy(12345)).toContain('12.3');
    expect(UsageFigures.hours(5400)).toContain('1.5');
  });

  it('lists revenue per currency, or a dash', () => {
    expect(UsageFigures.revenue([])).toBe('—');
    const text = UsageFigures.revenue([
      { currency: 'GBP', amount: 880 },
      { currency: 'EUR', amount: 200 },
    ]);
    expect(text).toContain('8.80');
    expect(text).toContain(' + ');
  });

  it('puts the busiest and the least online first, and colors uptime', () => {
    const row = (id: string, utilisation: number, uptime: number) =>
      ({ id, utilisation_percent: utilisation, uptime_percent: uptime }) as UsageRow;
    const rows = [row('a', 10, 99.5), row('b', 30, 95), row('c', 20, 98)];
    expect(UsageFigures.busiest(rows).map((each) => each.id)).toEqual(['b', 'c', 'a']);
    expect(UsageFigures.leastOnline(rows, 2).map((each) => each.id)).toEqual(['b', 'c']);
    expect([99.5, 98, 95].map((percent) => UsageFigures.uptimeTone(percent))).toEqual([
      '',
      'warn',
      'danger',
    ]);
  });
});
