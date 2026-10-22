import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body of PATCH /v1/tariffs/{id}: a new name. Prices change by adding a version. Needs If-Match. */
export class UpdateTariffRequestDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name!: string;
}
