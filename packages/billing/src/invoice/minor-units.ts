/** Amounts in integer minor units (pence, cents) as text, for invoice lines and e-mails. */
export class MinorUnits {
  static decimals(currency: string): number {
    try {
      const format = new Intl.NumberFormat('en', { style: 'currency', currency });
      return format.resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      return 2;
    }
  }

  /** 123456 GBP as "GBP 1,234.56": the code first, which reads the same in every language. */
  static text(amount: number, currency: string): string {
    const decimals = MinorUnits.decimals(currency);
    const major = amount / 10 ** decimals;
    const number = new Intl.NumberFormat('en', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(major);
    return `${currency} ${number}`;
  }

  /** 2000 basis points as "20 %". */
  static percent(bps: number): string {
    const value = bps / 100;
    return `${Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, '')} %`;
  }
}
