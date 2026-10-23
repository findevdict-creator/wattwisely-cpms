import { ApiProperty } from '@nestjs/swagger';
import { UsageRevenue } from '@wattwisely/reports';

/** Revenue in one currency, in minor units. */
export class RevenueDto {
  @ApiProperty({ example: 'GBP' }) readonly currency: string;
  @ApiProperty({ example: 88000 }) readonly amount: number;

  constructor(revenue: UsageRevenue) {
    this.currency = revenue.currency;
    this.amount = revenue.amount;
  }
}
