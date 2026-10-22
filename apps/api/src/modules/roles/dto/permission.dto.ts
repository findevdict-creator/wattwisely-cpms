import { ApiProperty } from '@nestjs/swagger';
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

  constructor(definition: PermissionDefinition) {
    this.key = definition.key;
    this.area = definition.area;
    this.label = definition.label;
    this.is_read_only = definition.isReadOnly;
  }
}
