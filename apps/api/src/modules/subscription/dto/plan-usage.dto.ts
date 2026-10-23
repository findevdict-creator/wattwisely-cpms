import { ApiProperty } from '@nestjs/swagger';
import { PlanSummary } from '../../../common/entitlements/tenant-entitlements';
import { TenantOverviewRecord } from '../tenant-overview.repository';

/** How much of the plan a tenant uses: seats and connectors against their limits. */
export class PlanUsageDto {
  @ApiProperty({ description: 'Active members plus open invitations' })
  readonly users: number;

  @ApiProperty({ nullable: true, description: 'Null means unlimited' })
  readonly user_limit: number | null;

  @ApiProperty({ description: 'Connectors of chargers that exist, AC and DC' })
  readonly connectors: number;

  @ApiProperty({ nullable: true, description: 'Null means unlimited' })
  readonly connector_limit: number | null;

  @ApiProperty()
  readonly ac_connectors: number;

  @ApiProperty()
  readonly dc_connectors: number;

  @ApiProperty()
  readonly sites: number;

  @ApiProperty()
  readonly chargers: number;

  @ApiProperty({ nullable: true })
  readonly last_session_at: string | null;

  constructor(overview: TenantOverviewRecord, plan: PlanSummary | null) {
    this.users = overview.memberCount + overview.invitedCount;
    this.user_limit = plan?.userLimit ?? null;
    this.connectors = overview.acConnectorCount + overview.dcConnectorCount;
    this.connector_limit = plan?.connectorLimit ?? null;
    this.ac_connectors = overview.acConnectorCount;
    this.dc_connectors = overview.dcConnectorCount;
    this.sites = overview.siteCount;
    this.chargers = overview.chargerCount;
    this.last_session_at = overview.lastSessionAt?.toISOString() ?? null;
  }
}
