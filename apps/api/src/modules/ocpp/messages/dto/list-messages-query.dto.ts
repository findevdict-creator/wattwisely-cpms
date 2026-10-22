import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Query of GET /v1/chargers/{id}/messages. Newest first. */
export class ListMessagesQueryDto {
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

  @ApiProperty({ required: false, enum: ['in', 'out'] })
  @IsOptional()
  @IsIn(['in', 'out'])
  readonly direction?: 'in' | 'out';

  @ApiProperty({ required: false, description: 'Comma list, e.g. BootNotification,Heartbeat' })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    (Array.isArray(value) ? value : String(value).split(',')).map((item) => item.trim()),
  )
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  readonly action?: string[];

  @ApiProperty({ required: false, description: 'Only CALLERROR frames' })
  @IsOptional()
  @Transform(({ value }: { value: string | boolean }) => value === true || value === 'true')
  @IsBoolean()
  readonly errors_only?: boolean;
}
