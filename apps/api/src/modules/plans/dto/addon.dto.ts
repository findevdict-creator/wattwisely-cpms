import { ApiProperty } from '@nestjs/swagger';
import { ModuleCatalog } from '../../../common/permissions/module-catalog';
import { AddonRecord } from '../plan-record';

/** One add-on module and its price. */
export class AddonDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'load_management' })
  readonly key: string;

  @ApiProperty({ example: 'Load management' })
  readonly name: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ example: 'USD' })
  readonly currency: string;

  @ApiProperty({ example: 300, description: 'Per month per pricing_unit, in minor units' })
  readonly price: number;

  @ApiProperty({ enum: ['per_connector', 'per_site', 'per_tenant'] })
  readonly pricing_unit: string;

  @ApiProperty({
    description: 'Inactive add-ons stay with the tenants that have them but are not sold',
  })
  readonly is_active: boolean;

  @ApiProperty()
  readonly sort_order: number;

  @ApiProperty()
  readonly version: number;

  constructor(record: AddonRecord) {
    const module = ModuleCatalog.find(record.key);
    this.id = record.id;
    this.key = record.key;
    this.name = module?.name ?? record.key;
    this.description = module?.description ?? '';
    this.currency = record.currency;
    this.price = record.price;
    this.pricing_unit = record.pricingUnit;
    this.is_active = record.isActive;
    this.sort_order = record.sortOrder;
    this.version = record.version;
  }
}
