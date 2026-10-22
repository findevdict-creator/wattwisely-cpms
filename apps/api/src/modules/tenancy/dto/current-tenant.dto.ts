import { ApiProperty } from '@nestjs/swagger';
import { TenantSummary } from '../../../common/tenant/tenant-summary';

/** Body of GET /v1/tenant: the tenant this request is working in. */
export class CurrentTenantDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'acme-charging' })
  readonly slug: string;

  @ApiProperty({ example: 'Acme Charging' })
  readonly name: string;

  @ApiProperty({ enum: ['trial', 'active', 'suspended'] })
  readonly status: string;

  constructor(tenant: TenantSummary) {
    this.id = tenant.id;
    this.slug = tenant.slug;
    this.name = tenant.name;
    this.status = tenant.status;
  }
}
