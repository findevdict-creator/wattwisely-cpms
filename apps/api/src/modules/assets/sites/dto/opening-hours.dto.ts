import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { OpeningPeriodDto } from './opening-period.dto';

/** Weekly opening hours. Leave a day out, or give it an empty list, to close it. */
export class OpeningHoursDto {
  @ApiProperty({ required: false, type: [OpeningPeriodDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OpeningPeriodDto)
  readonly mon?: OpeningPeriodDto[];

  @ApiProperty({ required: false, type: [OpeningPeriodDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OpeningPeriodDto)
  readonly tue?: OpeningPeriodDto[];

  @ApiProperty({ required: false, type: [OpeningPeriodDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OpeningPeriodDto)
  readonly wed?: OpeningPeriodDto[];

  @ApiProperty({ required: false, type: [OpeningPeriodDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OpeningPeriodDto)
  readonly thu?: OpeningPeriodDto[];

  @ApiProperty({ required: false, type: [OpeningPeriodDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OpeningPeriodDto)
  readonly fri?: OpeningPeriodDto[];

  @ApiProperty({ required: false, type: [OpeningPeriodDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OpeningPeriodDto)
  readonly sat?: OpeningPeriodDto[];

  @ApiProperty({ required: false, type: [OpeningPeriodDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(4)
  @ValidateNested({ each: true })
  @Type(() => OpeningPeriodDto)
  readonly sun?: OpeningPeriodDto[];
}
