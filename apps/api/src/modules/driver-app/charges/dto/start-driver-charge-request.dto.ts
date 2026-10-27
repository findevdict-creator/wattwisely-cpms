import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Body of POST /v1/driver/charges: which plug, and the consent a first charge at a new operator needs. */
export class StartDriverChargeRequestDto {
  @ApiProperty({ example: 'CP-RIVER-1', description: 'The OCPP identity printed on the charger' })
  @IsString()
  @MaxLength(100)
  readonly charger_identity!: string;

  @ApiProperty({ example: 1, description: 'The connector number on the charger: 1, 2, …' })
  @IsInt()
  @Min(1)
  @Max(100)
  readonly ocpp_connector_id!: number;

  @ApiProperty({
    required: false,
    description:
      'True when the driver agreed that this operator may keep a record of them (needed when the place says needs_consent)',
  })
  @IsOptional()
  @IsBoolean()
  readonly is_consent_given?: boolean;
}
