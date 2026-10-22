import { ApiProperty } from '@nestjs/swagger';
import { ReceiptLineDto } from '../../../tariffs/dto/receipt-line.dto';
import { ChargeOutcome } from '../charge-receipt.lookup';

/** A finished charge's receipt on the driver's page. Amounts are minor units of the charge's currency. */
export class ChargeReceiptDto {
  @ApiProperty({ type: [ReceiptLineDto] })
  readonly lines: ReceiptLineDto[];

  @ApiProperty({ nullable: true })
  readonly net: number | null;

  @ApiProperty({ nullable: true })
  readonly tax: number | null;

  @ApiProperty({ nullable: true, description: 'The final price' })
  readonly gross: number | null;

  @ApiProperty()
  readonly priced_at: string;

  constructor(outcome: ChargeOutcome, pricedAt: Date) {
    this.lines = outcome.lines.map((line) => new ReceiptLineDto(line));
    this.net = outcome.netAmount;
    this.tax = outcome.taxAmount;
    this.gross = outcome.grossAmount;
    this.priced_at = pricedAt.toISOString();
  }
}
