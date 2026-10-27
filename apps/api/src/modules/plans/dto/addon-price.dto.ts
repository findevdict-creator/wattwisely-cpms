import { ApiProperty } from '@nestjs/swagger';
import { AddonRecord } from '../plan-record';

/** What an add-on costs. */
export class AddonPriceDto {
  @ApiProperty({ example: 300, description: 'Per month per pricing_unit, in minor units' })
  readonly amount: number;

  @ApiProperty({ example: 'USD' })
  readonly currency: string;

  @ApiProperty({ enum: ['per_connector', 'per_site', 'per_tenant'] })
  readonly pricing_unit: string;

  constructor(record: AddonRecord) {
    this.amount = record.price;
    this.currency = record.currency;
    this.pricing_unit = record.pricingUnit;
  }
}
