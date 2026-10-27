import { ApiProperty } from '@nestjs/swagger';
import { ReportExportDto } from './report-export.dto';

/** GET /v1/reports/exports: the caller's last 50 exports, newest first. */
export class ReportExportListDto {
  @ApiProperty({ type: [ReportExportDto] })
  readonly items: ReportExportDto[];

  constructor(items: ReportExportDto[]) {
    this.items = items;
  }
}
