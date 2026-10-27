import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body of POST /v1/drivers/{id}/block: why, for the audit log and the driver page. */
export class BlockDriverRequestDto {
  @ApiProperty({ required: false, maxLength: 500, example: 'Left the company' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly reason?: string;
}
