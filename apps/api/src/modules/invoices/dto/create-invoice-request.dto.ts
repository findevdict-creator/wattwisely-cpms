import { ApiProperty } from '@nestjs/swagger';
import { Matches } from 'class-validator';

/** Body of POST /v1/admin/tenants/{id}/invoices: the month to draft an invoice for. */
export class CreateInvoiceRequestDto {
  @ApiProperty({ example: '2026-09', description: 'A month that is over' })
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: 'month must read like 2026-09' })
  readonly month!: string;
}
