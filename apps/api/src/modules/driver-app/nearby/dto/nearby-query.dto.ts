import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

/** Query of GET /v1/driver/places/nearby: where the phone is, and how far to look. */
export class NearbyQueryDto {
  @ApiProperty({ example: 53.3478 })
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  readonly latitude!: number;

  @ApiProperty({ example: -6.2597 })
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  readonly longitude!: number;

  @ApiProperty({ required: false, default: 15, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  readonly radius_km?: number;
}
