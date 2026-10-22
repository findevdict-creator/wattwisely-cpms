import { ApiProperty } from '@nestjs/swagger';
import { RoleGrant } from '../../../common/permissions/permission-set';

/** One role I hold, for the whole tenant (site_id null) or one site. */
export class HeldRoleDto {
  @ApiProperty()
  readonly role_id: string;

  @ApiProperty({ nullable: true, example: 'technician' })
  readonly key: string | null;

  @ApiProperty({ example: 'Technician' })
  readonly name: string;

  @ApiProperty({ nullable: true })
  readonly site_id: string | null;

  constructor(grant: RoleGrant) {
    this.role_id = grant.roleId;
    this.key = grant.roleKey;
    this.name = grant.roleName;
    this.site_id = grant.siteId;
  }
}
