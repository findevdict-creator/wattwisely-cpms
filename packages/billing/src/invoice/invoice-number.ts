/** Invoice numbers: "WW-2026-0012", one run per year without gaps (module 15). */
export class InvoiceNumber {
  static readonly PREFIX = 'WW';

  static format(year: number, sequence: number): string {
    return `${InvoiceNumber.PREFIX}-${year}-${String(sequence).padStart(4, '0')}`;
  }
}
