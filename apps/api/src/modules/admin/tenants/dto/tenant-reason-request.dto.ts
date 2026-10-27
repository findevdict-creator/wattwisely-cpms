import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body of suspend and reactivate: why, for the audit log (story ADM-02). */
export class TenantReasonRequestDto {
  @ApiProperty({ example: 'Invoice 2026-09 unpaid after two reminders' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  readonly reason!: string;
}
