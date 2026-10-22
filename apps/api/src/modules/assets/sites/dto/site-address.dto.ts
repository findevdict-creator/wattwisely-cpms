import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** A postal address. Stored as sent, so it is also the shape of `address` in every site answer. */
export class SiteAddressDto {
  @ApiProperty({ example: '12 Riverside Rd' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  readonly line1!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly line2?: string;

  @ApiProperty({ example: 'London' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  readonly city!: string;

  @ApiProperty({ example: 'SE1 9PX' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  readonly postal_code!: string;

  @ApiProperty({ required: false, description: 'State, province or county' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly region?: string;

  @ApiProperty({ example: 'GB', description: 'ISO 3166-1 alpha-2' })
  @Matches(/^[A-Z]{2}$/, { message: 'country must be a two-letter ISO code such as GB' })
  readonly country!: string;
}
