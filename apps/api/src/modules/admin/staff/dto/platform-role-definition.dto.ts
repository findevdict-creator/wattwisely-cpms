import { ApiProperty } from '@nestjs/swagger';
import { PlatformRoleDefinition } from '../../../../common/platform/platform-role-catalog';

/** One console role and what it allows, for the staff screen. */
export class PlatformRoleDefinitionDto {
  @ApiProperty({ example: 'billing' })
  readonly key: string;

  @ApiProperty({ example: 'Billing' })
  readonly name: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ type: [String] })
  readonly permission_keys: string[];

  constructor(role: PlatformRoleDefinition) {
    this.key = role.key;
    this.name = role.name;
    this.description = role.description;
    this.permission_keys = [...role.permissionKeys];
  }
}
