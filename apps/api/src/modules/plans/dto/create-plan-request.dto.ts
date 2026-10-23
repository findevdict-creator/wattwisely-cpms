import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PlanFieldsDto } from './plan-fields.dto';

/** Body of POST /v1/admin/plans: a code and a name; everything else has a default. */
export class CreatePlanRequestDto extends PlanFieldsDto {
  @ApiProperty({
    example: 'growth-eu',
    description: 'Lower-case letters, digits and dashes; fixed afterwards',
  })
  @Matches(/^[a-z0-9][a-z0-9-]{1,39}$/, {
    message: 'code must be 2 to 40 lower-case letters, digits or dashes',
  })
  readonly code!: string;

  @ApiProperty({ example: 'Growth (EU)' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  readonly name!: string;
}
