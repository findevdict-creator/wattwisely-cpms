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
});
