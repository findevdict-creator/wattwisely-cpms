import { Money } from './money';

describe('Money', () => {
  it('writes a unit price with the currency’s decimals, or more when the price has them', () => {
    expect(Money.unitPrice('0.4000', 'EUR')).toBe(Money.format(40, 'EUR'));
    expect(Money.unitPrice('0.1250', 'EUR')).toMatch(/0\.125$/);
    expect(Money.unitPrice('12.0000', 'JPY')).toMatch(/12$/);
  });
});
