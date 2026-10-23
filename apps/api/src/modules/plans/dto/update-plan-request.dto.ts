import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PlanFieldsDto } from './plan-fields.dto';

/** Body of PATCH /v1/admin/plans/{id}: any field but the code. */
export class UpdatePlanRequestDto extends PlanFieldsDto {
  @ApiProperty({ required: false, example: 'Growth' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  readonly name?: string;
}
