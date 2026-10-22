import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { CommandAction, CommandCatalog, CommandStatus } from '@wattwisely/ocpp-contracts';

/** Query of GET /v1/chargers/{id}/commands. Newest first. */
export class ListCommandsQueryDto {
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

  @ApiProperty({ required: false, enum: CommandCatalog.ACTIONS, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    (Array.isArray(value) ? value : String(value).split(',')).map((item) => item.trim()),
  )
  @IsIn(CommandCatalog.ACTIONS, { each: true })
  readonly action?: CommandAction[];

  @ApiProperty({ required: false, enum: CommandCatalog.STATUSES, isArray: true })
  @IsOptional()
  @Transform(({ value }: { value: string | string[] }) =>
    (Array.isArray(value) ? value : String(value).split(',')).map((item) => item.trim()),
  )
  @IsIn(CommandCatalog.STATUSES, { each: true })
  readonly status?: CommandStatus[];
}
