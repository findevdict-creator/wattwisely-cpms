import { Money } from './money';

describe('Money', () => {
  it('formats minor units with the decimals of the currency', () => {
    expect(Money.format(880, 'GBP')).toContain('8.80');
    expect(Money.format(1200, 'JPY')).toContain('1,200');
    expect(Money.format(null, 'GBP')).toBe('—');
  });

  it('gives the sign of a currency', () => {
    expect(Money.symbol('GBP')).toBe('£');
    expect(Money.symbol('EUR')).toBe('€');
  });

  it('reads amounts typed into a field, exactly', () => {
    expect(Money.fromText('8.8', 'GBP')).toBe(880);
    expect(Money.fromText('0.07', 'GBP')).toBe(7);
    expect(Money.fromText('10', 'GBP')).toBe(1000);
    expect(Money.fromText('1.234', 'GBP')).toBeNull();
    expect(Money.fromText('', 'GBP')).toBeNull();
    expect(Money.toText(880, 'GBP')).toBe('8.80');
  });
});
