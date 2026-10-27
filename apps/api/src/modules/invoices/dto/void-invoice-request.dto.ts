import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body of POST /v1/admin/invoices/{id}/void: why the invoice is cancelled. Needs If-Match. */
export class VoidInvoiceRequestDto {
  @ApiProperty({ example: 'Wrong connector count; a new invoice follows', maxLength: 500 })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  readonly reason!: string;
}
