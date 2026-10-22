import { ApiProperty } from '@nestjs/swagger';
import { PricingResult } from '@wattwisely/pricing';
import { ReceiptLineDto } from './receipt-line.dto';

/** What the made-up session of a preview would cost. */
export class TariffPreviewDto {
  @ApiProperty({ example: 'GBP' })
  readonly currency: string;

  @ApiProperty({ type: [ReceiptLineDto] })
  readonly lines: ReceiptLineDto[];

  @ApiProperty()
  readonly net_total: number;

  @ApiProperty()
  readonly tax_total: number;

  @ApiProperty({ description: 'What the driver pays, in minor units' })
  readonly gross_total: number;

  @ApiProperty()
  readonly energy_wh: number;

  @ApiProperty()
  readonly charging_minutes: number;

  @ApiProperty()
  readonly idle_minutes: number;

  @ApiProperty()
  readonly billable_idle_minutes: number;

  @ApiProperty({ type: [String] })
  readonly flags: string[];

  constructor(result: PricingResult) {
    this.currency = result.currency;
    this.lines = result.lines.map((line) => new ReceiptLineDto(line));
    this.net_total = result.netTotal;
    this.tax_total = result.taxTotal;
    this.gross_total = result.grossTotal;
    this.energy_wh = result.energyWh;
    this.charging_minutes = result.chargingMinutes;
    this.idle_minutes = result.idleMinutes;
    this.billable_idle_minutes = result.billableIdleMinutes;
    this.flags = result.flags;
  }
}
