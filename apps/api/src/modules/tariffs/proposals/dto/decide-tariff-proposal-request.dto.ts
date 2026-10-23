import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body of the approve and reject endpoints: the Owner's comment (required when rejecting). */
export class DecideTariffProposalRequestDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly comment?: string;
}
