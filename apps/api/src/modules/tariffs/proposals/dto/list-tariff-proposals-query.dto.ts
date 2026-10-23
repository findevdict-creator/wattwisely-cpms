import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/** Query of GET /v1/tariff-proposals. Without a status every proposal is listed, newest first. */
export class ListTariffProposalsQueryDto {
  static readonly STATUSES = ['proposed', 'approved', 'rejected', 'withdrawn'] as const;

  @ApiProperty({ required: false, enum: ListTariffProposalsQueryDto.STATUSES })
  @IsOptional()
  @IsIn(ListTariffProposalsQueryDto.STATUSES)
  readonly status?: (typeof ListTariffProposalsQueryDto.STATUSES)[number];
}
