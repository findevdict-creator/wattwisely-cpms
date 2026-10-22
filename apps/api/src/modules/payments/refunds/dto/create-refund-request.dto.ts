import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

/** Body of POST /v1/payments/{id}/refunds. */
export class CreateRefundRequestDto {
  @ApiProperty({ example: 250, description: 'Minor units of the payment’s currency' })
  @IsInt()
  @Min(1)
  readonly amount!: number;

  @ApiProperty({
    example: 'Charger stopped early',
    description: 'Shown to the driver on the card statement',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  readonly reason!: string;
}
