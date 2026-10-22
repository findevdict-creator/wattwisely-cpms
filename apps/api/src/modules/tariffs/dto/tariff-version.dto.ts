import { ApiProperty } from '@nestjs/swagger';
import { TariffPrices, TariffVersionRow } from '../tariff-prices';
import { TariffBandDto } from './tariff-band.dto';

/** One version of a tariff's prices, as the API shows it (amounts in minor units). */
export class TariffVersionDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ description: '1 for the first version; the highest is in force' })
  readonly number: number;

  @ApiProperty({ example: '20.00' })
  readonly tax_rate: string;

  @ApiProperty()
  readonly is_tax_included: boolean;

  @ApiProperty()
  readonly start_fee: number;

  @ApiProperty()
  readonly idle_grace_minutes: number;

  @ApiProperty({ nullable: true })
  readonly idle_fee_cap: number | null;

  @ApiProperty({ nullable: true })
  readonly minimum_price: number | null;

  @ApiProperty({ nullable: true })
  readonly maximum_price: number | null;

  @ApiProperty()
  readonly is_free_without_energy: boolean;

  @ApiProperty({ type: [TariffBandDto] })
  readonly bands: TariffBandDto[];

  @ApiProperty()
  readonly note: string;

  @ApiProperty()
  readonly created_at: string;

  constructor(version: TariffVersionRow) {
    this.id = version.id;
    this.number = version.number;
    this.tax_rate = TariffPrices.rateToPercent(version.taxRate);
    this.is_tax_included = version.isTaxIncluded;
    this.start_fee = version.startFee;
    this.idle_grace_minutes = version.idleGraceMinutes;
    this.idle_fee_cap = version.idleFeeCap;
    this.minimum_price = version.minimumPrice;
    this.maximum_price = version.maximumPrice;
    this.is_free_without_energy = version.isFreeWithoutEnergy;
    this.bands = version.bands.map((band) => ({
      name: band.name,
      days: band.days,
      start: band.start,
      end: band.end,
      energy_price_per_kwh: TariffPrices.toDecimal(band.energyPricePerKwh),
      time_price_per_hour: TariffPrices.toDecimal(band.timePricePerHour),
      idle_fee_per_minute: TariffPrices.toDecimal(band.idleFeePerMinute),
    }));
    this.note = version.note;
    this.created_at = version.createdAt.toISOString();
  }
}
