/** The months staff may draft an invoice for by hand: the last twelve that are over, newest first. */
export class InvoiceMonths {
  static readonly COUNT = 12;

  /** [{ key: '2026-09', label: 'September 2026' }, ...] for a call made in October 2026. */
  static past(now = new Date()): { key: string; label: string }[] {
    const months: { key: string; label: string }[] = [];
    for (let back = 1; back <= InvoiceMonths.COUNT; back += 1) {
      const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      months.push({ key: first.toISOString().slice(0, 7), label: InvoiceMonths.label(first) });
    }
    return months;
  }

  static label(first: Date): string {
    return first.toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }
}
