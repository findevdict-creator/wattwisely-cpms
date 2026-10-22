import { ApiProperty } from '@nestjs/swagger';
import { TenantMembership } from '../../../common/tenant/tenant-membership';

/** One tenant in the user's tenant switcher. */
export class TenantMembershipDto {
  @ApiProperty({ example: '7f9c2b1e-0c4d-4a8e-9a39-2d2c7c1f5b10' })
  readonly id: string;

  @ApiProperty({ example: 'acme-charging' })
  readonly alias: string;

  constructor(membership: TenantMembership) {
    this.id = membership.id;
    this.alias = membership.alias;
  }
}
