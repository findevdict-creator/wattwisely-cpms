import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

/** Body of POST /v1/chargers/{id}/commands/change-availability. */
export class ChangeAvailabilityRequestDto {
  @ApiProperty({ required: false, description: 'One connector; leave out for the whole charger' })
  @IsOptional()
  @IsUUID()
  readonly connector_id?: string;

  @ApiProperty({ description: 'true: take into service; false: take out of service' })
  @IsBoolean()
  readonly operative!: boolean;
}
