import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

/** Body of POST /v1/driver/payment-methods: the setup the card form confirmed. */
export class SavePaymentMethodRequestDto {
  @ApiProperty({ example: 'seti_1Abc' })
  @IsString()
  @MaxLength(100)
  readonly setup_id!: string;
}
