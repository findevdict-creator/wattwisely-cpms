import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

/** Body of POST /v1/public/charges: which plug the driver is standing at (from the QR code). */
export class StartChargeRequestDto {
  @ApiProperty({ example: 'CP-RIVER-1', description: 'The OCPP identity printed on the charger' })
  @IsString()
  @MaxLength(100)
  readonly charger_identity!: string;

  @ApiProperty({ example: 1, description: 'The connector number on the charger: 1, 2, …' })
  @IsInt()
  @Min(1)
  @Max(100)
  readonly ocpp_connector_id!: number;
}
