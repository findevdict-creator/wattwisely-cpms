import { Currency } from './currency';
import { Rate } from './rate';

describe('Rate', () => {
  it('rounds half up, and half away from zero below zero', () => {
    expect(Rate.divideHalfUp(25, 10)).toBe(3);
    expect(Rate.divideHalfUp(24, 10)).toBe(2);
    expect(Rate.divideHalfUp(-25, 10)).toBe(-3);
    expect(Rate.divideHalfUp(0, 7)).toBe(0);
    expect(() => Rate.divideHalfUp(1, 0)).toThrow();
  });

  it('knows the minor units of a currency', () => {
    expect(Currency.minorPerMajor('GBP')).toBe(100);
    expect(Currency.minorPerMajor('jpy')).toBe(1);
    expect(Currency.minorPerMajor('KWD')).toBe(1000);
    expect(Currency.isCode('EUR')).toBe(true);
    expect(Currency.isCode('euro')).toBe(false);
  });
});
