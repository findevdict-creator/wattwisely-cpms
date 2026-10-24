/** The words for one of Wattwisely's invoices to the company (module 15). */
export class InvoiceStatusLabels {
  static readonly INVOICE: Record<string, string> = {
    issued: 'Open',
    overdue: 'Overdue',
    paid: 'Paid',
    void: 'Cancelled',
  };

  static invoice(status: string): string {
    return InvoiceStatusLabels.INVOICE[status] ?? status;
  }
}
