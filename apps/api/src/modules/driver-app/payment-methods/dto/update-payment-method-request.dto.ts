import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

/** Body of PATCH /v1/driver/payment-methods/{id}: the only change is making a card the default. */
export class UpdatePaymentMethodRequestDto {
  @ApiProperty({ example: true })
  @Equals(true)
  readonly is_default!: boolean;
}
