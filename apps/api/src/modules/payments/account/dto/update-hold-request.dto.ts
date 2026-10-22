import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Max, Min } from 'class-validator';

/** Body of PATCH /v1/payment-account: how much to hold on a driver's card at the start. */
export class UpdateHoldRequestDto {
  @ApiProperty({
    example: 5000,
    description: 'Minor units of the account currency, e.g. 5000 = 50.00',
  })
  @IsInt()
  @Min(100)
  @Max(100_000)
  readonly hold_amount!: number;
}
