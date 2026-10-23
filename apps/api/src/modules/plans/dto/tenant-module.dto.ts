import { ApiProperty } from '@nestjs/swagger';
import {
  EntitlementRecord,
  TenantEntitlements,
} from '../../../common/entitlements/tenant-entitlements';
import { ModuleCatalog, ModuleDefinition } from '../../../common/permissions/module-catalog';
import { AddonRecord } from '../plan-record';
import { AddonPriceDto } from './addon-price.dto';

/** One module as one tenant has it: switched on or off, and why. */
export class TenantModuleDto {
  @ApiProperty({ example: 'load_management' })
  readonly key: string;

  @ApiProperty({ example: 'Load management' })
  readonly name: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ enum: ['core', 'plan', 'addon'] })
  readonly kind: string;

  @ApiProperty()
  readonly is_enabled: boolean;

  @ApiProperty({ enum: ['core', 'plan', 'addon', 'trial', 'override'], nullable: true })
  readonly source: string | null;

  @ApiProperty({ nullable: true, description: 'When a trial ends' })
  readonly ends_at: string | null;

  @ApiProperty({ type: AddonPriceDto, nullable: true, description: 'Add-ons only' })
  readonly price: AddonPriceDto | null;

  constructor(
    module: ModuleDefinition,
    entitlements: TenantEntitlements,
    entitlement: EntitlementRecord | undefined,
    addon: AddonRecord | undefined,
  ) {
    this.key = module.key;
    this.name = module.name;
    this.description = module.description;
    this.kind = module.kind;
    this.is_enabled = entitlements.isModuleEnabled(module.key);
    this.source = entitlements.sourceOf(module.key);
    this.ends_at = entitlement?.endsAt?.toISOString() ?? null;
    this.price = addon ? new AddonPriceDto(addon) : null;
  }

  /** Every module in catalogue order, as the tenant has it. */
  static listFor(entitlements: TenantEntitlements, addons: AddonRecord[]): TenantModuleDto[] {
    return ModuleCatalog.ENTRIES.map(
      (module) =>
        new TenantModuleDto(
          module,
          entitlements,
          entitlements.entitlements.find((row) => row.featureKey === module.key),
          addons.find((addon) => addon.key === module.key),
        ),
    );
  }
}
