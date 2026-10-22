import { ApiProperty } from '@nestjs/swagger';
import { TenantSummary } from '../../../common/tenant/tenant-summary';

/** One tenant in the user's tenant switcher. */
export class TenantMembershipDto {
  @ApiProperty({ example: '0192f5c4-7d3e-7a10-9a39-2d2c7c1f5b10' })
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
