import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TariffPricesRequestDto } from '../../dto/tariff-prices-request.dto';

/**
 * Body of POST /v1/tariff-proposals: new prices for an existing tariff (tariff_id), or a
 * new tariff (name and currency). The prices are the same body a tariff version takes.
 */
export class CreateTariffProposalRequestDto {
  @ApiProperty({ required: false, description: 'The tariff to change; omitted: a new tariff' })
  @IsOptional()
  @IsUUID('all')
  readonly tariff_id?: string;

  @ApiProperty({ required: false, example: 'Standard AC', description: 'For a new tariff' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly name?: string;

  @ApiProperty({ required: false, example: 'GBP', description: 'For a new tariff' })
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a three-letter code like GBP' })
  readonly currency?: string;

  @ApiProperty({ type: TariffPricesRequestDto })
  @ValidateNested()
  @Type(() => TariffPricesRequestDto)
  readonly prices!: TariffPricesRequestDto;

  @ApiProperty({ required: false, description: 'Why the change is proposed, shown to the Owner' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  readonly note?: string;
}
