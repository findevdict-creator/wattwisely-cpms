import { ApiProperty } from '@nestjs/swagger';
import { PlanSummary } from '../../../common/entitlements/tenant-entitlements';

/** The plan the current tenant is on, as far as the portal's menu needs it. */
export class MyPlanDto {
  @ApiProperty({ example: 'growth' })
  readonly code: string;

  @ApiProperty({ example: 'Growth' })
  readonly name: string;

  constructor(plan: PlanSummary) {
    this.code = plan.code;
    this.name = plan.name;
  }
}
