import { ApiProperty } from '@nestjs/swagger';
import { InvoiceDto } from './invoice.dto';

/** Answer of POST /v1/admin/invoices/{id}/issue. */
export class IssueInvoiceResultDto {
  @ApiProperty({ type: InvoiceDto })
  readonly invoice: InvoiceDto;

  @ApiProperty({ description: 'False when the tenant has no billing e-mail address' })
  readonly is_email_sent: boolean;

  constructor(invoice: InvoiceDto, isEmailSent: boolean) {
    this.invoice = invoice;
    this.is_email_sent = isEmailSent;
  }
}
