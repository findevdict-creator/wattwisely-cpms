import { ApiProperty } from '@nestjs/swagger';
import { InvoiceSummaryDto } from './invoice-summary.dto';

/** One page of invoices. */
export class InvoicePageDto {
  @ApiProperty({ type: [InvoiceSummaryDto] })
  readonly items: InvoiceSummaryDto[];

  @ApiProperty({
    nullable: true,
    description: 'Pass as cursor for the next page; null on the last',
  })
  readonly next_cursor: string | null;

  constructor(items: InvoiceSummaryDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
