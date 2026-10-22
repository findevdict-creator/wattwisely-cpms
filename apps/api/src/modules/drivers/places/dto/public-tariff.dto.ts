import { ApiProperty } from '@nestjs/swagger';
import { TariffBandDto } from '../../../tariffs/dto/tariff-band.dto';
import { TariffPrices } from '../../../tariffs/tariff-prices';
import { PlaceTariff } from '../place-tariff.lookup';

/** The prices at a charger as the QR page shows them before the driver pays. Amounts are minor units. */
export class PublicTariffDto {
  @ApiProperty({ example: 'Standard' })
  readonly name: string;

  @ApiProperty({ example: 'GBP' })
  readonly currency: string;

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

  @ApiProperty({
    type: [TariffBandDto],
    description: 'Unit prices as decimals, e.g. "0.4000" per kWh',
  })
  readonly bands: TariffBandDto[];

  @ApiProperty({
    nullable: true,
    example: 'Peak',
    description: 'The band in force at the site now',
  })
  readonly current_band: string | null;

  constructor(tariff: PlaceTariff, currentBand: string | null) {
    const version = tariff.version;
    this.name = tariff.name;
    this.currency = tariff.currency;
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
    this.current_band = currentBand;
  }
}
