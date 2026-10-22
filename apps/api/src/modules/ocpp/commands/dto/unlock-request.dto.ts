import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Body of POST /v1/chargers/{id}/commands/unlock. */
export class UnlockRequestDto {
  @ApiProperty({ description: 'The connector whose cable to release' })
  @IsUUID()
  readonly connector_id!: string;
}
