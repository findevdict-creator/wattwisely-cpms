import { ApiProperty } from '@nestjs/swagger';
import { UsageReport } from '@wattwisely/reports';
import { OverviewCounts } from '../overview.repository';
import { RevenueDto } from './revenue.dto';

/** GET /v1/reports/overview: the numbers on the portal's home page. */
export class OverviewDto {
  @ApiProperty() readonly chargers: number;
  @ApiProperty({ description: 'Connected to the platform right now' })
  readonly chargers_online: number;
  @ApiProperty({ description: 'With an offline alert' }) readonly chargers_offline: number;
  @ApiProperty() readonly connectors_faulted: number;
  @ApiProperty() readonly sessions_active: number;
  @ApiProperty() readonly alerts_open: number;
  @ApiProperty({ description: 'Sessions started in the last 24 hours' })
  readonly sessions_24h: number;
  @ApiProperty() readonly energy_wh_24h: number;
  @ApiProperty({ type: [RevenueDto] }) readonly revenue_24h: RevenueDto[];
  @ApiProperty({ description: 'Utilisation over the last 24 hours' })
  readonly utilisation_percent_24h: number;

  constructor(counts: OverviewCounts, day: UsageReport) {
    this.chargers = counts.chargers;
    this.chargers_online = counts.chargers_online;
    this.chargers_offline = counts.chargers_offline;
    this.connectors_faulted = counts.connectors_faulted;
    this.sessions_active = counts.sessions_active;
    this.alerts_open = counts.alerts_open;
    this.sessions_24h = day.totals.sessions;
    this.energy_wh_24h = day.totals.energyWh;
    this.revenue_24h = day.totals.revenue.map((revenue) => new RevenueDto(revenue));
    this.utilisation_percent_24h = day.totals.utilisationPercent;
  }
}
