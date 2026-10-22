import { ApiProperty } from '@nestjs/swagger';
import { TenantMembership } from '../../../common/tenant/tenant-membership';

/** Body of GET /v1/tenant: the tenant this request is working in. */
export class CurrentTenantDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'acme-charging' })
  readonly alias: string;

  constructor(tenant: TenantMembership) {
    this.id = tenant.id;
    this.alias = tenant.alias;
  }
}
