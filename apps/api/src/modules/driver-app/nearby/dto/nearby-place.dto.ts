import { ApiProperty } from '@nestjs/swagger';
import { TariffPrices } from '../../../tariffs/tariff-prices';
import { NearbySiteRow } from '../nearby-site-details.repository';
import { NearbyPlugDto } from './nearby-plug.dto';

/** One site of GET /v1/driver/places/nearby (module 35). */
export class NearbyPlaceDto {
  @ApiProperty() readonly tenant_id: string;
  @ApiProperty({ example: 'Acme Charging' }) readonly operator_name: string;
  @ApiProperty() readonly site_id: string;
  @ApiProperty({ example: 'Riverside Car Park' }) readonly site_name: string;
  @ApiProperty({ example: '12 Riverside Road, Dublin' }) readonly address: string;
  @ApiProperty() readonly latitude: number;
  @ApiProperty() readonly longitude: number;
  @ApiProperty({ example: 420, description: 'Metres from the point asked about' })
  readonly distance_m: number;
  @ApiProperty({ example: 4 }) readonly connector_count: number;
  @ApiProperty({ example: 2, description: 'Plugs that could start now' })
  readonly available_count: number;
  @ApiProperty({ description: 'Only members of the operator charge here' })
  readonly is_private_site: boolean;
  @ApiProperty({ description: 'The operator keeps a member record of this login' })
  readonly is_member: boolean;
  @ApiProperty({ nullable: true, example: 'EUR' }) readonly currency: string | null;
  @ApiProperty({
    nullable: true,
    example: '0.3000',
    description: 'The lowest energy price, per kWh',
  })
  readonly from_energy_price_per_kwh: string | null;
  @ApiProperty({ type: NearbyPlugDto, nullable: true }) readonly plug: NearbyPlugDto | null;

  constructor(row: NearbySiteRow, distanceM: number) {
    this.tenant_id = row.tenant_id;
    this.operator_name = row.operator_name;
    this.site_id = row.id;
    this.site_name = row.name;
    this.address = [row.address.line1, row.address.city].filter(Boolean).join(', ');
    this.latitude = row.latitude;
    this.longitude = row.longitude;
    this.distance_m = Math.round(distanceM);
    this.connector_count = row.connector_count;
    this.available_count = row.available_count;
    this.is_private_site = row.visibility === 'private';
    this.is_member = row.is_member;
    this.currency = row.currency;
    this.from_energy_price_per_kwh = NearbyPlaceDto.lowestPrice(row);
    this.plug = row.plug ? new NearbyPlugDto(row.plug) : null;
  }

  private static lowestPrice(row: NearbySiteRow): string | null {
    const prices = (row.bands ?? []).map((band) => band.energyPricePerKwh);
    return row.currency && prices.length ? TariffPrices.toDecimal(Math.min(...prices)) : null;
  }
}
