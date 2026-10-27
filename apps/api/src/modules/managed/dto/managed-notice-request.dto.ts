import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

/** Body of the notice endpoints: when the service should end (30 days from now at the earliest) and why. */
export class ManagedNoticeRequestDto {
  @ApiProperty({ required: false, description: 'ISO date-time; omitted: exactly 30 days from now' })
  @IsOptional()
  @IsDateString()
  readonly ends_at?: string;

  @ApiProperty({ required: false, description: 'For the audit log' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly reason?: string;
}
