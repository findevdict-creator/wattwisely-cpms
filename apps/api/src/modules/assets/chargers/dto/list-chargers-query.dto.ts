import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { ChargerStatus, ChargerStatusSql } from '../charger-status';

/** Query of GET /v1/chargers (API Design, "Chargers"). Sorted by identity. */
export class ListChargersQueryDto {
  @ApiProperty({ required: false, default: 25, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  readonly limit?: number;

  @ApiProperty({ required: false, description: 'next_cursor from the previous page' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  readonly cursor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID()
  readonly site_id?: string;

  @ApiProperty({
    required: false,
    enum: ChargerStatusSql.VALUES,
    isArray: true,
    description: 'One or more, comma-separated',
  })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    (Array.isArray(value) ? value : String(value).split(',')).map((status) => status.trim()),
  )
  @IsIn(ChargerStatusSql.VALUES, { each: true })
  readonly status?: ChargerStatus[];

  @ApiProperty({ required: false, enum: ['1.6', '2.0.1'] })
  @IsOptional()
  @IsIn(['1.6', '2.0.1'])
  readonly ocpp_version?: '1.6' | '2.0.1';

  @ApiProperty({ required: false, enum: ['password', 'none'] })
  @IsOptional()
  @IsIn(['password', 'none'])
  readonly auth_mode?: 'password' | 'none';

  @ApiProperty({ required: false, description: 'Exact vendor name, case-insensitive' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly vendor?: string;

  @ApiProperty({ required: false, description: 'Searches identity, serial numbers and site name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly q?: string;
}
