import { ApiProperty } from '@nestjs/swagger';
import { TenantEntitlements } from '../../../common/entitlements/tenant-entitlements';
import { ModuleCatalog } from '../../../common/permissions/module-catalog';
import { PermissionDefinition } from '../../../common/permissions/permission-catalog';

/** One permission key with its label, grouped by module on the matrix screen. */
export class PermissionDto {
  @ApiProperty({ example: 'chargers:command' })
  readonly key: string;

  @ApiProperty({ example: 'chargers' })
  readonly area: string;

  @ApiProperty({ example: 'Start, stop, reset and unlock' })
  readonly label: string;

  @ApiProperty({ description: 'Read-only permissions still work while a tenant is suspended' })
  readonly is_read_only: boolean;

  @ApiProperty({ example: 'chargers', description: 'The module the permission belongs to' })
  readonly module: string;

  @ApiProperty({ example: 'Chargers', description: 'The module as the matrix screen names it' })
  readonly module_name: string;

  @ApiProperty({ description: 'True when the plan does not include the module (module 9)' })
  readonly is_locked: boolean;

  constructor(definition: PermissionDefinition, entitlements: TenantEntitlements) {
    const module = ModuleCatalog.moduleOf(definition.key);
    this.key = definition.key;
    this.area = definition.area;
    this.label = definition.label;
    this.is_read_only = definition.isReadOnly;
    this.module = module?.key ?? '';
    this.module_name = module?.name ?? '';
    this.is_locked = entitlements.isPermissionLocked(definition.key);
  }
}
