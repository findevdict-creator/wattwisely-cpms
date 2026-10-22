import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength, ValidateNested } from 'class-validator';
import { TariffPricesRequestDto } from './tariff-prices-request.dto';

/** Body of POST /v1/tariffs: a name, a currency and the first version's prices. */
export class CreateTariffRequestDto {
  @ApiProperty({ example: 'Standard AC' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({ example: 'GBP', description: 'ISO 4217; fixed for the life of the tariff' })
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a three-letter code like GBP' })
  readonly currency!: string;

  @ApiProperty({ type: TariffPricesRequestDto })
  @ValidateNested()
  @Type(() => TariffPricesRequestDto)
  readonly prices!: TariffPricesRequestDto;
}
