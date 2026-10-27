import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { LoadChargerSettingDto } from './load-charger-setting.dto';

/** Body of PUT /v1/sites/{siteId}/load-management: the whole policy, and every charger's settings. */
export class UpdateLoadManagementRequestDto {
  @ApiProperty()
  @IsBoolean()
  readonly is_enabled!: boolean;

  @ApiProperty({ example: 100, description: 'kW' })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(1)
  @Max(100_000)
  readonly limit_kw!: number;

  @ApiProperty({ enum: ['equal_share', 'priority'] })
  @IsIn(['equal_share', 'priority'])
  readonly strategy!: 'equal_share' | 'priority';

  @ApiProperty({ example: 4.2, description: 'kW; what a charging charger always gets' })
  @IsNumber({ maxDecimalPlaces: 1 })
  @Min(0)
  @Max(1000)
  readonly min_power_kw!: number;

  @ApiProperty({ type: [LoadChargerSettingDto] })
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => LoadChargerSettingDto)
  readonly chargers!: LoadChargerSettingDto[];
}
