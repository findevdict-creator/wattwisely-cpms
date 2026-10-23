import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches } from 'class-validator';

/** Body of POST /v1/payment-account: opens the company's Stripe Express account. */
export class ConnectAccountRequestDto {
  @ApiProperty({
    example: 'GB',
    description: 'ISO 3166-1 alpha-2, where the company is registered',
  })
  @IsString()
  @Matches(/^[A-Z]{2}$/, { message: 'country must be a two-letter ISO code' })
  readonly country!: string;
}
