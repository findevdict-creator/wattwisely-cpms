import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

/** Query of the service report endpoints. */
export class ServiceReportQueryDto {
  @ApiProperty({ required: false, example: '2026-05', description: 'Omitted: last month' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/)
  readonly month?: string;
}
