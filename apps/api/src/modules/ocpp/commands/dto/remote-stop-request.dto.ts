import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Body of POST /v1/chargers/{id}/commands/remote-stop. */
export class RemoteStopRequestDto {
  @ApiProperty({ description: 'The running session to stop' })
  @IsUUID()
  readonly session_id!: string;

  @ApiProperty({ required: false, description: 'Why, for the audit log' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly reason?: string;
}
