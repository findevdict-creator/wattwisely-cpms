import { ApiProperty } from '@nestjs/swagger';
import { ReportScheduleDto } from './report-schedule.dto';

/** GET /v1/reports/schedules: every schedule of the tenant, by name. */
export class ReportScheduleListDto {
  @ApiProperty({ type: [ReportScheduleDto] })
  readonly items: ReportScheduleDto[];

  constructor(items: ReportScheduleDto[]) {
    this.items = items;
  }
}
