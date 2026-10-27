import { ApiProperty } from '@nestjs/swagger';
import { ReportMonth } from '../report/report-month';
import { ChargerReportRow, ServiceReportData } from '../report/service-report-data';
import { ServiceReportChargerDto } from './service-report-charger.dto';
import { ServiceReportTariffChangeDto } from './service-report-tariff-change.dto';

/** The monthly service report of a managed tenant (story MGT-04). */
export class ServiceReportDto {
  @ApiProperty({ example: '2026-05' })
  readonly month: string;

  @ApiProperty()
  readonly tenant_id: string;

  @ApiProperty()
  readonly generated_at: string;

  @ApiProperty({ description: 'False while the month is still running' })
  readonly is_complete: boolean;

  @ApiProperty({ nullable: true, description: 'The currency of the revenue figures' })
  readonly currency: string | null;

  @ApiProperty({ type: [ServiceReportChargerDto] })
  readonly chargers: ServiceReportChargerDto[];

  @ApiProperty({ description: 'Sums over all chargers' })
  readonly totals: { sessions: number; energy_kwh: string; revenue: number; faults: number };

  @ApiProperty({ description: 'Refunds that succeeded in the month, in minor units' })
  readonly refunds: { count: number; total: number };

  @ApiProperty({ type: [ServiceReportTariffChangeDto] })
  readonly tariff_changes: ServiceReportTariffChangeDto[];

  @ApiProperty({ description: 'Audit log entries written by Managed operators in the month' })
  readonly actions_by_wattwisely: number;

  @ApiProperty({ type: [String], description: 'What the report cannot show yet' })
  readonly limitations: string[];

  constructor(month: ReportMonth, data: ServiceReportData, now: Date = new Date()) {
    this.month = month.key;
    this.tenant_id = data.tenantId;
    this.generated_at = now.toISOString();
    this.is_complete = month.isComplete(now);
    this.currency = data.currency;
    this.chargers = data.chargers.map((row) => new ServiceReportChargerDto(row));
    this.totals = ServiceReportDto.totalsOf(data.chargers);
    this.refunds = data.refunds;
    this.tariff_changes = data.tariffChanges.map((row) => new ServiceReportTariffChangeDto(row));
    this.actions_by_wattwisely = data.actionsByWattwisely;
    this.limitations = [
      'Uptime per charger needs the connection history, which the gateway does not keep yet; boots and faults stand in for it.',
    ];
  }

  private static totalsOf(rows: ChargerReportRow[]) {
    const sum = (pick: (row: ChargerReportRow) => number) =>
      rows.reduce((total, row) => total + pick(row), 0);
    return {
      sessions: sum((row) => row.sessions),
      energy_kwh: (sum((row) => row.energyWh) / 1000).toFixed(3),
      revenue: sum((row) => row.revenue),
      faults: sum((row) => row.faults),
    };
  }
}
