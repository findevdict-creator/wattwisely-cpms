import { ApiProperty } from '@nestjs/swagger';
import { ModuleDefinition } from '../../../common/permissions/module-catalog';

/** One module of the product, for the plan editor and the tenant's module switches. */
export class ModuleDto {
  @ApiProperty({ example: 'load_management' })
  readonly key: string;

  @ApiProperty({ example: 'Load management' })
  readonly name: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty({ enum: ['core', 'plan', 'addon'] })
  readonly kind: string;

  @ApiProperty({ type: [String], example: ['load_management:read', 'load_management:write'] })
  readonly permission_keys: string[];

  constructor(module: ModuleDefinition) {
    this.key = module.key;
    this.name = module.name;
    this.description = module.description;
    this.kind = module.kind;
    this.permission_keys = [...module.permissionKeys];
  }
}
