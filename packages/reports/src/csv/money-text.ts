import { Currency } from '@wattwisely/pricing';

/** Minor units as text in the major unit, for CSV and e-mail: 880 GBP is "8.80". */
export class MoneyText {
  static major(amount: number, currency: string): string {
    return (amount / Currency.minorPerMajor(currency)).toFixed(Currency.decimals(currency));
  }

  /** "GBP 8.80": the currency code first, which reads the same in every language. */
  static withCode(amount: number, currency: string): string {
    return `${currency} ${MoneyText.major(amount, currency)}`;
  }
}
