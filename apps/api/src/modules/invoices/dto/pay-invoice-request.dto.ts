import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Body of POST /v1/admin/invoices/{id}/pay: the invoice was paid. Needs If-Match. */
export class PayInvoiceRequestDto {
  @ApiProperty({ required: false, description: 'When it was paid; now when left out' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/, { message: 'paid_at must be a date' })
  readonly paid_at?: string;

  @ApiProperty({ required: false, example: 'Bank transfer 2026-10-14', maxLength: 120 })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly payment_reference?: string;
}
