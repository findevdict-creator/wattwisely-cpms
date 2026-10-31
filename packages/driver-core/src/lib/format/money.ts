/**
 * Amounts in the API are integer minor units (pence, cents). This turns them into text
 * for people and back, with as many decimals as the currency has (two for GBP, none for JPY).
 */
export class Money {
  static decimals(currency: string): number {
    const format = new Intl.NumberFormat('en', { style: 'currency', currency });
    return format.resolvedOptions().maximumFractionDigits ?? 2;
  }

  /** "£8.80"; a dash when there is no amount. */
  static format(amount: number | null | undefined, currency: string | null | undefined): string {
    if (amount === null || amount === undefined || !currency) {
      return '—';
    }
    const major = amount / 10 ** Money.decimals(currency);
    return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(major);
  }

  /**
   * A unit price as the API writes it ("0.4000" per kWh) with the currency's sign: "€0.40", or
   * "€0.125" when the price needs more than the currency's usual decimals.
   */
  static unitPrice(decimal: string, currency: string): string {
    const fraction = (decimal.split('.')[1] ?? '').replace(/0+$/, '');
    const digits = Math.max(Money.decimals(currency), fraction.length);
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(Number(decimal));
  }

  /** 880 as "8.80", for an input field. */
  static toText(amount: number | null, currency: string): string {
    return amount === null
      ? ''
      : (amount / 10 ** Money.decimals(currency)).toFixed(Money.decimals(currency));
  }

  /** "8.8" as 880; null for an empty field or text that is not an amount. */
  static fromText(text: string, currency: string): number | null {
    const decimals = Money.decimals(currency);
    const pattern = decimals === 0 ? /^\d+$/ : new RegExp(`^\\d+(\\.\\d{1,${decimals}})?$`);
    const trimmed = text.trim();
    if (!pattern.test(trimmed)) {
      return null;
    }
    const [whole, fraction = ''] = trimmed.split('.');
    return Number(whole) * 10 ** decimals + Number(fraction.padEnd(decimals, '0') || '0');
  }
}
