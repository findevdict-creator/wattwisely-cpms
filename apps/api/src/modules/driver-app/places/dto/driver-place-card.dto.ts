import { ApiProperty } from '@nestjs/swagger';

/** The saved card a hold would be taken from. */
export class DriverPlaceCardDto {
  @ApiProperty({ example: 'visa' }) readonly brand: string;
  @ApiProperty({ example: '4242' }) readonly last4: string;

  constructor(card: { brand: string; last4: string }) {
    this.brand = card.brand;
    this.last4 = card.last4;
  }
}
