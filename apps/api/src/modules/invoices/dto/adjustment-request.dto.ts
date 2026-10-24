import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

/** Body of POST /v1/admin/invoices/{id}/lines: an adjustment on a draft. Needs If-Match. */
export class AdjustmentRequestDto {
  @ApiProperty({ example: 'Credit for the outage on 12 September', maxLength: 200 })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  readonly description!: string;

  @ApiProperty({
    example: -5000,
    description: "Minor units of the invoice's currency; negative for a credit",
  })
  @IsInt()
  @Min(-1_000_000_000)
  @Max(1_000_000_000)
  readonly amount!: number;
}
