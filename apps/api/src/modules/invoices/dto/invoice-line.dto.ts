import { ApiProperty } from '@nestjs/swagger';
import { InvoiceLineRow } from '../invoice-record';

/** One line of an invoice. */
export class InvoiceLineDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly position: number;

  @ApiProperty({
    enum: [
      'platform_fee',
      'ac_connector_fee',
      'dc_connector_fee',
      'addon',
      'managed_service',
      'revenue_share',
      'adjustment',
    ],
  })
  readonly kind: string;

  @ApiProperty({ example: 'Growth plan, 12–30 September (19 of 30 days)' })
  readonly description: string;

  @ApiProperty({ example: 5 })
  readonly quantity: number;

  @ApiProperty({ nullable: true, description: 'Per unit and month, before proration' })
  readonly unit_price: number | null;

  @ApiProperty({ description: "Minor units of the invoice's currency" })
  readonly amount: number;

  @ApiProperty({ description: 'How the amount came about: days, module key, revenue' })
  readonly details: Record<string, unknown>;

  constructor(row: InvoiceLineRow) {
    this.id = row.id;
    this.position = row.position;
    this.kind = row.kind;
    this.description = row.description;
    this.quantity = row.quantity;
    this.unit_price = row.unitPrice;
    this.amount = row.amount;
    this.details = row.details;
  }
}
