import { ApiProperty } from '@nestjs/swagger';
import { OverviewCounts } from '../admin-overview.repository';
import { PlanCountDto } from './plan-count.dto';
import { TenantCountsDto } from './tenant-counts.dto';

/** Body of GET /v1/admin/overview: the platform at a glance. */
export class AdminOverviewDto {
  @ApiProperty({ type: TenantCountsDto })
  readonly tenants: TenantCountsDto;

  @ApiProperty({ description: 'Connectors of chargers that exist, across live tenants' })
  readonly connectors: number;

  @ApiProperty()
  readonly ac_connectors: number;

  @ApiProperty()
  readonly dc_connectors: number;

  @ApiProperty()
  readonly sites: number;

  @ApiProperty()
  readonly chargers: number;

  @ApiProperty({ type: [PlanCountDto] })
  readonly plans: PlanCountDto[];

  @ApiProperty({ description: 'Wattwisely staff with console access' })
  readonly staff: number;

  constructor(counts: OverviewCounts) {
    this.tenants = new TenantCountsDto(counts.tenantsByStatus);
    this.connectors = counts.acConnectors + counts.dcConnectors;
    this.ac_connectors = counts.acConnectors;
    this.dc_connectors = counts.dcConnectors;
    this.sites = counts.sites;
    this.chargers = counts.chargers;
    this.plans = counts.tenantsByPlan.map((plan) => new PlanCountDto(plan));
    this.staff = counts.staff;
  }
}
