import { ApiProperty } from '@nestjs/swagger';
import { UsageReport } from '@wattwisely/reports';
import { UsageRowDto } from './usage-row.dto';

/** GET /v1/reports/usage: utilisation, uptime and revenue by site or charger (PRD, Reports). */
export class UsageReportDto {
  @ApiProperty() readonly from: string;
  @ApiProperty() readonly to: string;
  @ApiProperty({ enum: ['site', 'charger'] }) readonly group_by: string;
  @ApiProperty({ type: [UsageRowDto] }) readonly rows: UsageRowDto[];
  @ApiProperty({ type: UsageRowDto }) readonly totals: UsageRowDto;

  constructor(report: UsageReport) {
    this.from = report.from.toISOString();
    this.to = report.to.toISOString();
    this.group_by = report.groupBy;
    this.rows = report.rows.map((row) => new UsageRowDto(row));
    this.totals = new UsageRowDto(report.totals);
  }
}
