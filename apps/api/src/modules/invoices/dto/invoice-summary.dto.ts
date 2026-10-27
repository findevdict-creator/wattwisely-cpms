import { ApiProperty } from '@nestjs/swagger';
import { BillingPeriod } from '@wattwisely/billing';
import { InvoiceRecord, InvoiceStatuses } from '../invoice-record';

/** One invoice without its lines: a row of a list. */
export class InvoiceSummaryDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly tenant_id: string;

  @ApiProperty({ example: 'acme-charging' })
  readonly tenant_slug: string;

  @ApiProperty({ example: 'Acme Charging' })
  readonly tenant_name: string;

  @ApiProperty({ nullable: true, example: 'WW-2026-0012', description: 'Given when issued' })
  readonly number: string | null;

  @ApiProperty({ enum: ['draft', 'issued', 'paid', 'void'] })
  readonly status: string;

  @ApiProperty({ description: 'Issued and past its due date' })
  readonly is_overdue: boolean;

  @ApiProperty({ example: '2026-09', description: 'The month billed' })
  readonly month: string;

  @ApiProperty({ example: 'September 2026' })
  readonly month_label: string;

  @ApiProperty({ example: '2026-09-01' })
  readonly period_start: string;

  @ApiProperty({ example: '2026-09-30' })
  readonly period_end: string;

  @ApiProperty({ example: 'USD' })
  readonly currency: string;

  @ApiProperty({ description: 'Minor units' })
  readonly subtotal: number;

  @ApiProperty({ example: 2000, description: 'Basis points' })
  readonly tax_rate_bps: number;

  @ApiProperty()
  readonly tax_amount: number;

  @ApiProperty()
  readonly total: number;

  @ApiProperty({ nullable: true })
  readonly issued_at: string | null;

  @ApiProperty({ nullable: true })
  readonly due_at: string | null;

  @ApiProperty({ nullable: true })
  readonly paid_at: string | null;

  @ApiProperty({ nullable: true })
  readonly voided_at: string | null;

  @ApiProperty()
  readonly created_at: string;

  @ApiProperty({ description: 'Send as If-Match when changing the invoice' })
  readonly version: number;

  constructor(record: InvoiceRecord) {
    const { invoice } = record;
    const period = BillingPeriod.parse(invoice.periodStart.slice(0, 7)) as BillingPeriod;
    this.id = invoice.id;
    this.tenant_id = invoice.tenantId;
    this.tenant_slug = record.tenant.slug;
    this.tenant_name = record.tenant.name;
    this.number = invoice.number;
    this.status = invoice.status;
    this.is_overdue = InvoiceStatuses.isOverdue(invoice);
    this.month = period.key;
    this.month_label = period.label;
    this.period_start = invoice.periodStart;
    this.period_end = invoice.periodEnd;
    this.currency = invoice.currency;
    this.subtotal = invoice.subtotal;
    this.tax_rate_bps = invoice.taxRateBps;
    this.tax_amount = invoice.taxAmount;
    this.total = invoice.total;
    this.issued_at = InvoiceSummaryDto.iso(invoice.issuedAt);
    this.due_at = InvoiceSummaryDto.iso(invoice.dueAt);
    this.paid_at = InvoiceSummaryDto.iso(invoice.paidAt);
    this.voided_at = InvoiceSummaryDto.iso(invoice.voidedAt);
    this.created_at = invoice.createdAt.toISOString();
    this.version = invoice.version;
  }

  static iso(date: Date | null): string | null {
    return date ? date.toISOString() : null;
  }
}
