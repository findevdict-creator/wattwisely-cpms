import { ApiProperty } from '@nestjs/swagger';
import { PlatformAccess } from '../../../common/platform/platform-access';

/** My role in the admin console (module 9), so the console can hide what I cannot do. */
export class PlatformRoleDto {
  @ApiProperty({ enum: ['admin', 'billing', 'support', 'viewer'] })
  readonly role: string;

  @ApiProperty({ type: [String], example: ['tenants:read', 'plans:read'] })
  readonly permissions: string[];

  constructor(access: PlatformAccess) {
    this.role = access.role;
    this.permissions = access.keys();
  }
}
