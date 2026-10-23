import { ApiProperty } from '@nestjs/swagger';
import { ReportScheduleRecord } from '../report-schedules.repository';

/** A scheduled usage report (PRD, Reports: scheduled e-mail on the advanced plan). */
export class ReportScheduleDto {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly name: string;
  @ApiProperty({ enum: ['weekly', 'monthly'] }) readonly frequency: string;
  @ApiProperty({ enum: ['site', 'charger'] }) readonly group_by: string;
  @ApiProperty({ nullable: true, type: String }) readonly site_id: string | null;
  @ApiProperty({ nullable: true, type: String }) readonly site_name: string | null;
  @ApiProperty({ type: [String] }) readonly recipients: string[];
  @ApiProperty() readonly time_zone: string;
  @ApiProperty() readonly is_active: boolean;
  @ApiProperty() readonly next_run_at: string;
  @ApiProperty({ nullable: true, type: String }) readonly last_run_at: string | null;
  @ApiProperty() readonly version: number;

  constructor(schedule: ReportScheduleRecord) {
    this.id = schedule.id;
    this.name = schedule.name;
    this.frequency = schedule.frequency;
    this.group_by = schedule.groupBy;
    this.site_id = schedule.siteId;
    this.site_name = schedule.siteName;
    this.recipients = schedule.recipients;
    this.time_zone = schedule.timeZone;
    this.is_active = schedule.isActive;
    this.next_run_at = schedule.nextRunAt.toISOString();
    this.last_run_at = schedule.lastRunAt?.toISOString() ?? null;
    this.version = schedule.version;
  }
}
