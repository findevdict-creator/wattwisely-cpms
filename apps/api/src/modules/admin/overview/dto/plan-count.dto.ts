import { ApiProperty } from '@nestjs/swagger';

/** How many tenants are on one plan. */
export class PlanCountDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'growth' })
  readonly code: string;

  @ApiProperty({ example: 'Growth' })
  readonly name: string;

  @ApiProperty()
  readonly tenant_count: number;

  constructor(plan: { id: string; code: string; name: string; tenantCount: number }) {
    this.id = plan.id;
    this.code = plan.code;
    this.name = plan.name;
    this.tenant_count = plan.tenantCount;
  }
}
