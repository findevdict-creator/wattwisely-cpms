import { ApiProperty } from '@nestjs/swagger';
import { UsageRow } from '@wattwisely/reports';
import { RevenueDto } from './revenue.dto';

/** One site or charger of a usage report, or the totals. */
export class UsageRowDto {
  @ApiProperty({ nullable: true, type: String }) readonly id: string | null;
  @ApiProperty() readonly name: string;
  @ApiProperty() readonly site_name: string;
  @ApiProperty() readonly chargers: number;
  @ApiProperty() readonly connectors: number;
  @ApiProperty() readonly sessions: number;
  @ApiProperty() readonly energy_wh: number;
  @ApiProperty({ type: [RevenueDto] }) readonly revenue: RevenueDto[];
  @ApiProperty({ description: 'Seconds a car was plugged in' }) readonly occupied_seconds: number;
  @ApiProperty({ description: 'Seconds the chargers were offline' })
  readonly offline_seconds: number;
  @ApiProperty({ example: 23.4 }) readonly utilisation_percent: number;
  @ApiProperty({ example: 99.2 }) readonly uptime_percent: number;

  constructor(row: Omit<UsageRow, 'id' | 'name' | 'siteName'> & Partial<UsageRow>) {
    this.id = row.id ?? null;
    this.name = row.name ?? 'Total';
    this.site_name = row.siteName ?? '';
    this.chargers = row.chargers;
    this.connectors = row.connectors;
    this.sessions = row.sessions;
    this.energy_wh = row.energyWh;
    this.revenue = row.revenue.map((revenue) => new RevenueDto(revenue));
    this.occupied_seconds = row.occupiedSeconds;
    this.offline_seconds = row.offlineSeconds;
    this.utilisation_percent = row.utilisationPercent;
    this.uptime_percent = row.uptimePercent;
  }
}
