import { ApiProperty } from '@nestjs/swagger';
import { TariffPrices } from '../tariff-prices';

/** One receipt line as the engine returns it or the session_line_items table stores it. */
export interface ReceiptLine {
  kind: string;
  bandName: string | null;
  from: Date | null;
  to: Date | null;
  quantity: number;
  unit: string;
  unitPrice: number | null;
  net: number;
  tax: number;
  gross: number;
}

/** One line of a session's receipt or a tariff preview. Amounts are minor units. */
export class ReceiptLineDto {
  @ApiProperty({ enum: ['start_fee', 'energy', 'time', 'idle', 'adjustment'] })
  readonly kind: string;

  @ApiProperty({ nullable: true, example: 'Peak' })
  readonly band_name: string | null;

  @ApiProperty({ nullable: true })
  readonly from: string | null;

  @ApiProperty({ nullable: true })
  readonly to: string | null;

  @ApiProperty({ description: 'Wh, minutes, or 1 for a fee or an adjustment' })
  readonly quantity: number;

  @ApiProperty({ enum: ['wh', 'min', 'session'] })
  readonly unit: string;

  @ApiProperty({ nullable: true, example: '0.4000', description: 'Per kWh, hour or minute' })
  readonly unit_price: string | null;

  @ApiProperty()
  readonly net: number;

  @ApiProperty()
  readonly tax: number;

  @ApiProperty()
  readonly gross: number;

  constructor(line: ReceiptLine) {
    this.kind = line.kind;
    this.band_name = line.bandName;
    this.from = line.from?.toISOString() ?? null;
    this.to = line.to?.toISOString() ?? null;
    this.quantity = line.quantity;
    this.unit = line.unit;
    this.unit_price = line.unitPrice === null ? null : TariffPrices.toDecimal(line.unitPrice);
    this.net = line.net;
    this.tax = line.tax;
    this.gross = line.gross;
  }
}
