import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, Max, Min, ValidateIf } from 'class-validator';

/** Body of PATCH /v1/payment-account: how much to hold on a card at the start, for guests and for the tenant's own drivers. */
export class UpdateHoldRequestDto {
  @ApiProperty({
    required: false,
    example: 5000,
    description: 'The guest hold, in minor units of the account currency, e.g. 5000 = 50.00',
  })
  @ValidateIf((body: UpdateHoldRequestDto) => body.member_hold_amount === undefined)
  @IsInt()
  @Min(100)
  @Max(100_000)
  readonly hold_amount?: number;

  @ApiProperty({
    required: false,
    example: 3000,
    description:
      'The hold on the saved card of one of your own drivers (module 19), unless their group sets its own',
  })
  @IsOptional()
  @IsInt()
  @Min(100)
  @Max(100_000)
  readonly member_hold_amount?: number;
}
