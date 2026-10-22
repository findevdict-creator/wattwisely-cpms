import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Body of POST /v1/chargers/{id}/connectors (story AST-03). Everything is optional:
 * the number defaults to the next free one and the label to the next letter.
 */
export class AddConnectorRequestDto {
  static readonly TYPES = ['ccs1', 'ccs2', 'type1', 'type2', 'chademo', 'gbt', 'nacs', 'unknown'];

  @ApiProperty({ required: false, minimum: 1, description: 'Defaults to the next free number' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  readonly ocpp_connector_id?: number;

  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  readonly evse_id?: number;

  @ApiProperty({ required: false, enum: AddConnectorRequestDto.TYPES, default: 'unknown' })
  @IsOptional()
  @IsIn(AddConnectorRequestDto.TYPES)
  readonly type?: string;

  @ApiProperty({ required: false, enum: ['ac', 'dc'] })
  @IsOptional()
  @IsIn(['ac', 'dc'])
  readonly current_type?: 'ac' | 'dc';

  @ApiProperty({ required: false, example: 22 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  readonly max_power_kw?: number;

  @ApiProperty({ required: false, example: 'A', description: 'Defaults to A, B, C…' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/\S/, { message: 'label must not be blank' })
  readonly label?: string;
}
