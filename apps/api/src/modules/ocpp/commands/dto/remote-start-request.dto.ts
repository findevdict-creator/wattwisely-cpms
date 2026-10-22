import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Body of POST /v1/chargers/{id}/commands/remote-start. */
export class RemoteStartRequestDto {
  @ApiProperty({ description: 'The connector to start on (its id, not its number)' })
  @IsUUID()
  readonly connector_id!: string;

  @ApiProperty({ required: false, description: 'Why, for the audit log' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly reason?: string;
}
