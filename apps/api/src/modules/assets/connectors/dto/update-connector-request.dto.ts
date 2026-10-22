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
import { AddConnectorRequestDto } from './add-connector-request.dto';

/** Body of PATCH /v1/connectors/{id}: only the fields sent change. Needs the If-Match header. */
export class UpdateConnectorRequestDto {
  @ApiProperty({ required: false, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  readonly ocpp_connector_id?: number;

  @ApiProperty({ required: false, minimum: 1, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  readonly evse_id?: number | null;

  @ApiProperty({ required: false, enum: AddConnectorRequestDto.TYPES })
  @IsOptional()
  @IsIn(AddConnectorRequestDto.TYPES)
  readonly type?: string;

  @ApiProperty({ required: false, enum: ['ac', 'dc'], nullable: true })
  @IsOptional()
  @IsIn(['ac', 'dc'])
  readonly current_type?: 'ac' | 'dc' | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  readonly max_power_kw?: number | null;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/\S/, { message: 'label must not be blank' })
  readonly label?: string;
}
