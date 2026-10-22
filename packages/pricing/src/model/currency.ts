/**
 * How many minor units make a major unit of a currency (ISO 4217 exponent): 100 for
 * most, 1 for the yen, 1000 for the dinars. Amounts in this library are minor units.
 */
export class Currency {
  static readonly DECIMALS: Record<string, number> = {
    BHD: 3,
    IQD: 3,
    JOD: 3,
    KWD: 3,
    LYD: 3,
    OMR: 3,
    TND: 3,
    CLP: 0,
    ISK: 0,
    JPY: 0,
    KRW: 0,
    PYG: 0,
    UGX: 0,
    VND: 0,
    XAF: 0,
    XOF: 0,
  };

  static decimals(code: string): number {
    return Currency.DECIMALS[code.toUpperCase()] ?? 2;
  }

  static minorPerMajor(code: string): number {
    return 10 ** Currency.decimals(code);
  }

  static isCode(value: string): boolean {
    return /^[A-Z]{3}$/.test(value);
  }
}
