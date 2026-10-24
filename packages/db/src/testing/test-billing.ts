import { UuidV7 } from '../client/uuid-v7';
import { TestData } from './test-data';

/** What a test invoice says; everything has a default. */
export interface InvoiceOptions {
  status?: 'draft' | 'issued' | 'paid' | 'void';
  /** "2026-09": the month billed. */
  month?: string;
  number?: string | null;
  currency?: string;
  subtotal?: number;
  taxRateBps?: number;
  issuedAt?: Date;
  dueAt?: Date;
  paidAt?: Date;
  billingEmail?: string;
}

/** Module 15's rows for tests: invoices and their lines, written as the worker and the API would. */
export class TestBilling {
  constructor(private readonly data: TestData) {}

  /** An issued invoice for last month unless the options say otherwise, with one plan fee line. */
  async invoice(tenantId: string, options: InvoiceOptions = {}): Promise<string> {
    const id = UuidV7.create();
    const row = TestBilling.rowOf(id, options);
    await this.data.sql(
      `insert into invoices (id, tenant_id, number, status, period_start, period_end, currency, subtotal,
         tax_rate_bps, tax_amount, total, billing_email, issued_at, due_at, paid_at)
       values ($1, $2, $3, $4, $5::date, ($5::date + interval '1 month' - interval '1 day')::date, $6, $7, $8, $9, $10,
         $11, $12, $13, $14)`,
      [
        id,
        tenantId,
        row.number,
        row.status,
        `${row.month}-01`,
        row.currency,
        row.subtotal,
        row.taxRateBps,
        row.tax,
        row.subtotal + row.tax,
        row.billingEmail,
        row.issuedAt,
        row.dueAt,
        row.paidAt,
      ],
    );
    await this.line(tenantId, id, { description: 'Growth plan', amount: row.subtotal });
    return id;
  }

  /** The options with their defaults filled in. */
  private static rowOf(id: string, options: InvoiceOptions) {
    const status = options.status ?? 'issued';
    const subtotal = options.subtotal ?? 29_900;
    const taxRateBps = options.taxRateBps ?? 0;
    return {
      status,
      month: options.month ?? TestBilling.lastMonth(),
      currency: options.currency ?? 'USD',
      subtotal,
      taxRateBps,
      tax: Math.round((subtotal * taxRateBps) / 10_000),
      billingEmail: options.billingEmail ?? null,
      paidAt: status === 'paid' ? (options.paidAt ?? new Date()) : null,
      ...TestBilling.issueOf(id, status, options),
    };
  }

  /** The number and dates an issued invoice has and a draft lacks. */
  private static issueOf(id: string, status: string, options: InvoiceOptions) {
    if (status === 'draft') {
      return { number: null, issuedAt: null, dueAt: null };
    }
    return {
      number: options.number ?? `WW-TEST-${id.slice(-4)}`,
      issuedAt: options.issuedAt ?? new Date(),
      dueAt: options.dueAt ?? new Date(Date.now() + 30 * 86_400_000),
    };
  }

  async line(
    tenantId: string,
    invoiceId: string,
    line: { description: string; amount: number; kind?: string; position?: number },
  ): Promise<string> {
    const id = UuidV7.create();
    await this.data.sql(
      `insert into invoice_lines (id, tenant_id, invoice_id, position, kind, description, quantity, unit_price, amount)
       values ($1, $2, $3, coalesce($4, (select coalesce(max(position), 0) + 1 from invoice_lines where invoice_id = $3)),
         $5, $6, 1, $7, $8)`,
      [
        id,
        tenantId,
        invoiceId,
        line.position ?? null,
        line.kind ?? 'platform_fee',
        line.description,
        line.amount,
        line.amount,
      ],
    );
    return id;
  }

  /** "2026-09" for a test run in October 2026. */
  static lastMonth(now = new Date()): string {
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
    return first.toISOString().slice(0, 7);
  }
}
