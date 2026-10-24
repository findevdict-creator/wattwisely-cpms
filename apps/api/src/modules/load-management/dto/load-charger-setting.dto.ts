import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNumber, IsOptional, IsUUID, Max, Min } from 'class-validator';

/** One charger's load settings in PUT /v1/sites/{siteId}/load-management. */
export class LoadChargerSettingDto {
  @ApiProperty()
  @IsUUID()
  readonly charger_id!: string;

  @ApiProperty({ example: 5, description: '1 to 10; 10 is served first' })
  @IsInt()
  @Min(1)
  @Max(10)
  readonly priority!: number;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 22,
    description: 'kW; null uses the connectors’ total',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(1000)
  readonly max_power_kw?: number | null;
}
