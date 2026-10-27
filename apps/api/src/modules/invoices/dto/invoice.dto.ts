import { ApiProperty } from '@nestjs/swagger';
import { InvoiceWithLines } from '../invoice-record';
import { InvoiceLineDto } from './invoice-line.dto';
import { InvoiceSummaryDto } from './invoice-summary.dto';

/** One invoice in full: GET /v1/admin/invoices/{id} and GET /v1/invoices/{id}. */
export class InvoiceDto extends InvoiceSummaryDto {
  @ApiProperty({ nullable: true, description: 'The billing contact as it was when issued' })
  readonly billing_name: string | null;

  @ApiProperty({ nullable: true })
  readonly billing_email: string | null;

  @ApiProperty({ nullable: true, description: 'VAT or purchase order number' })
  readonly billing_reference: string | null;

  @ApiProperty({ description: 'What was left out and why; one remark per line' })
  readonly remarks: string[];

  @ApiProperty({ nullable: true })
  readonly payment_reference: string | null;

  @ApiProperty({ nullable: true })
  readonly void_reason: string | null;

  @ApiProperty({ type: [InvoiceLineDto] })
  readonly lines: InvoiceLineDto[];

  constructor(record: InvoiceWithLines) {
    super(record);
    const { invoice } = record;
    this.billing_name = invoice.billingName;
    this.billing_email = invoice.billingEmail;
    this.billing_reference = invoice.billingReference;
    this.remarks = invoice.remarks ? invoice.remarks.split('\n') : [];
    this.payment_reference = invoice.paymentReference;
    this.void_reason = invoice.voidReason;
    this.lines = record.lines.map((line) => new InvoiceLineDto(line));
  }
}
