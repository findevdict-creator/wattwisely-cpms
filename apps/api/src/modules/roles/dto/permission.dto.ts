import { ApiProperty } from '@nestjs/swagger';
import { TenantEntitlements } from '../../../common/entitlements/tenant-entitlements';
import { ModuleCatalog } from '../../../common/permissions/module-catalog';
import { PermissionDefinition } from '../../../common/permissions/permission-catalog';

/** One permission key with its label, grouped by area on the matrix screen. */
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

  @ApiProperty({ description: 'True when the plan does not include the module (module 9)' })
  readonly is_locked: boolean;

  constructor(definition: PermissionDefinition, entitlements: TenantEntitlements) {
    this.key = definition.key;
    this.area = definition.area;
    this.label = definition.label;
    this.is_read_only = definition.isReadOnly;
    this.module = ModuleCatalog.moduleOf(definition.key)?.key ?? '';
    this.is_locked = entitlements.isPermissionLocked(definition.key);
  }
}
