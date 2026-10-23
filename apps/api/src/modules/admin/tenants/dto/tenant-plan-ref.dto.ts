import { ApiProperty } from '@nestjs/swagger';

/** The plan a tenant is on, by name. */
export class TenantPlanRefDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ example: 'growth' })
  readonly code: string;

  @ApiProperty({ example: 'Growth' })
  readonly name: string;

  constructor(plan: { id: string; code: string; name: string }) {
    this.id = plan.id;
    this.code = plan.code;
    this.name = plan.name;
  }
}
